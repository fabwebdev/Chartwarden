# Backend Structure Document

This document provides a clear overview of Chartwarden’s backend setup. It covers the architecture, data storage, APIs, hosting, infrastructure, security, and monitoring. Anyone reading this should understand how the backend works and how its parts fit together.

## 1. Backend Architecture

### Overview
The Chartwarden backend is built with a modern, layered design that separates concerns into clear modules:

- **Fastify (Node.js)**: A lightweight, fast web framework for building APIs.
- **Controllers**: Handle incoming requests and send responses.
- **Services**: Contain business logic and database operations.
- **Routes**: Map HTTP endpoints to controllers, with schema validation and middleware.
- **Middleware**: Shared code for authentication, authorization, logging, and error handling.
- **Job Scheduler**: Manages background tasks (reports, notifications, EDI parsing).

### Scalability, Maintainability, Performance

- **Scalability**: Each layer (API, database, cache) can scale independently. Fastify’s low overhead allows handling many requests. Redis offloads repeated queries.
- **Maintainability**: Clear folder structure (controllers, services, routes) makes it easy to find and update code. Shared configuration and type definitions reduce duplication.
- **Performance**: Drizzle ORM generates optimized queries. Pino Logger is non-blocking. Redis cache speeds up frequent lookups, and Socket.IO handles real-time events efficiently.

## 2. Database Management

### Technologies Used

- **Type**: Relational (SQL)
- **System**: PostgreSQL 16
- **ORM**: Drizzle ORM (TypeScript first)
- **Cache & Session Store**: Redis 7

### Data Organization and Practices

- **Schema-First Design**: Database tables are defined with clear relations for patients, staff, clinical records, billing, and bereavement.
- **Migrations & Versioning**: Schema changes are tracked and applied via migration scripts.
- **Connection Pooling**: Managed by Fastify/PostgreSQL driver to optimize concurrent queries.
- **Caching**: Redis caches session data, user permissions, and frequently accessed lookup tables.
- **Backups & Archiving**: Regular automated backups of the PostgreSQL database with point-in-time recovery enabled.

## 3. Database Schema

Below is a human-readable summary of key tables, followed by PostgreSQL table definitions.

### Human-Readable Table Overview

- **users**: Stores login credentials, profile info, role assignment.
- **roles**: Defines user roles (e.g., admin, clinician, billing).
- **permissions**: Lists actions users can perform.
- **role_permissions**: Links roles to permissions.
- **patients**: Contains demographic and admission details.
- **encounters**: Records clinical visit data tied to patients.
- **goals**: Patient care goals linked to encounters.
- **bereavement_cases**: Tracks post-loss follow-up and services.
- **edi_835_messages**: Stores raw and parsed ERA (Electronic Remittance Advice).

### PostgreSQL Schema (Sample)
```sql
-- users table
table users (
  id                 uuid primary key,
  email              varchar(255) unique not null,
  password_hash      varchar(255) not null,
  full_name          varchar(255),
  role_id            uuid references roles(id),
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- roles table
table roles (
  id   uuid primary key,
  name varchar(50) unique not null
);

-- permissions table
table permissions (
  id   uuid primary key,
  name varchar(100) unique not null
);

-- role_permissions join table
table role_permissions (
  role_id       uuid references roles(id),
  permission_id uuid references permissions(id),
  primary key (role_id, permission_id)
);

-- patients table
table patients (
  id              uuid primary key,
  first_name      varchar(100),
  last_name       varchar(100),
  dob             date,
  hospice_start   date,
  hospice_end     date,
  created_at      timestamptz default now()
);

-- encounters table
table encounters (
  id           uuid primary key,
  patient_id   uuid references patients(id),
  clinician_id uuid references users(id),
  type         varchar(100),
  occurred_at  timestamptz not null,
  notes        text,
  created_at   timestamptz default now()
);

-- goals table
table goals (
  id            uuid primary key,
  encounter_id  uuid references encounters(id),
  description   text,
  status        varchar(50),
  created_at    timestamptz default now()
);

-- bereavement_cases table
table bereavement_cases (
  id             uuid primary key,
  patient_id     uuid references patients(id),
  contact_date   date,
  follow_up_date date,
  notes          text,
  created_at     timestamptz default now()
);

-- edi_835_messages table
table edi_835_messages (
  id             uuid primary key,
  raw_message    text,
  parsed_json    jsonb,
  received_at    timestamptz default now()
);
```  

## 4. API Design and Endpoints

### RESTful Approach

The backend offers a RESTful API under `/api/...`. Each resource (patients, encounters, billing, reports) has its own route file.

### Key Endpoints

- **Authentication**
  - `POST /api/auth/login`: User login, returns JWT.
  - `POST /api/auth/logout`: Invalidate session.
- **User & Role Management**
  - `GET /api/users`: List users.
  - `POST /api/users`: Create a user.
  - `GET /api/roles`: List roles and permissions.
- **Patient Management**
  - `GET /api/patients`: Fetch patient list.
  - `POST /api/patients`: Admit a new patient.
  - `GET /api/patients/{id}`: Get patient details.
- **Encounters & Clinical Data**
  - `GET /api/patients/{id}/encounters`: List visits.
  - `POST /api/encounters`: Record a new encounter.
- **Goals**
  - `GET /api/encounters/{id}/goals`: Fetch care goals.
  - `POST /api/goals`: Create or update a goal.
- **Billing & EDI**
  - `POST /api/edi/835`: Upload and parse ERA files.
  - `GET /api/billing/claims`: List claims status.
- **Bereavement**
  - `GET /api/bereavement`: List cases.
  - `POST /api/bereavement`: Log a follow-up contact.
- **Reporting & Analytics**
  - `GET /api/reports/{type}`: Generate reports (CSV/PDF).

### Communication Flow

1. Frontend sends HTTP request to Fastify.
2. Middleware authenticates and checks permissions.
3. Route handler calls controller.
4. Controller delegates to service and returns JSON.
5. Frontend updates UI.

## 5. Hosting Solutions

### Cloud Environment

Chartwarden runs on a HIPAA-eligible cloud provider (e.g., AWS):

- **Compute**: Containerized Fastify services on AWS ECS/Fargate or EKS.
- **Database**: Amazon RDS for PostgreSQL (multi-AZ, automated backups).
- **Cache**: Amazon ElastiCache (Redis).
- **Object Storage**: Amazon S3 for file uploads and report archives.
- **Networking**: Private VPC with public and private subnets, security groups.

### Benefits

- **Reliability**: Managed services with SLA guarantees.
- **Scalability**: Auto-scaling ECS tasks based on load.
- **Cost-effectiveness**: Pay for what you use; reserved instances for steady loads.

## 6. Infrastructure Components

- **Load Balancer**: AWS Application Load Balancer distributes traffic across container instances.
- **CDN**: Amazon CloudFront serves static assets (JS, CSS) with low latency.
- **Redis Cache**: Speeds up session lookups and repeated queries.
- **Job Scheduler**: AWS EventBridge or a cron-style scheduler in the app handles nightly jobs.
- **CI/CD**: GitHub Actions pipelines build, test, and deploy containers.
- **Secrets Management**: AWS Secrets Manager for database passwords, API keys.

These pieces work together to ensure fast responses, high availability, and smooth user experience.

## 7. Security Measures

- **Authentication**: JWT-based via Better Auth, with secure cookie flags when applicable.
- **Authorization**: Role-Based Access Control (RBAC) enforced in middleware.
- **Encryption**: TLS for data in transit; AES-256 for data at rest in RDS and S3.
- **Audit Logging**: Pino Logger logs access and changes, with PII/PHI redaction.
- **Rate Limiting & CSRF**: Fastify plugins protect against brute-force and cross-site requests.
- **HIPAA Compliance**: Encryption, audit trails, and minimal PII exposure.

## 8. Monitoring and Maintenance

- **Logs & Metrics**: AWS CloudWatch collects application logs and custom metrics (request rates, error counts).
- **Performance Monitoring**: Prometheus/Grafana or DataDog for CPU, memory, query latency.
- **Alerts**: Threshold-based alerts for high error rates, slow queries, or service downtime.
- **Maintenance**:
  - Regular dependency updates via automated dependabot.
  - Database vacuuming and index health checks.
  - Security patching on container base images.

## 9. Conclusion and Overall Backend Summary

Chartwarden’s backend uses a clear, modular architecture to deliver a scalable, secure hospice EHR system. It relies on Fastify for high-performance APIs, PostgreSQL with Drizzle ORM for reliable data storage, and Redis for caching. The RESTful endpoints cover clinical, administrative, billing, and bereavement workflows. Hosted on a HIPAA-eligible cloud with managed services, it ensures reliability and cost efficiency. Strong security layers and monitoring tools keep patient data safe and the system running smoothly. Together, these components meet the project’s goals of compliance, performance, and maintainability, supporting caregivers and administrators in delivering quality hospice care.