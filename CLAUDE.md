# Chartwarden - Hospice EHR System

## Project Overview

Chartwarden is a **HIPAA-compliant Electronic Health Record (EHR) system** for hospice care providers. It combines a high-performance Fastify backend with a modern Next.js frontend in a monorepo structure.

## Architecture

```
Chartwarden/
├── apps/
│   └── web/                  # Next.js frontend (port 3000)
├── services/
│   └── api/                  # Fastify backend (port 3001)
├── packages/
│   ├── types/                # @chartwarden/types - Shared interfaces
│   └── utils/                # @chartwarden/utils - Shared utilities
├── infra/                    # Docker, deployment scripts
├── .automaker/               # AutoMaker working directory
├── docker-compose.yml        # Local development services
├── turbo.json                # Turborepo configuration
└── package.json              # Root workspace configuration
```

## Tech Stack

### Backend (services/api)
- **Framework**: Fastify (high-performance)
- **ORM**: Drizzle ORM + PostgreSQL
- **Auth**: Better Auth (cookie-based sessions)
- **Authorization**: RBAC + ABAC + CASL
- **Testing**: Jest

### Frontend (apps/web)
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS

### Database
- **PostgreSQL 16** with 50+ tables
- **Drizzle ORM** for type-safe queries

## Development Commands

```bash
# Start everything (recommended)
npm run docker:up             # PostgreSQL + Redis
npm run dev                   # Frontend + Backend (native)

# Individual apps
npm run dev:web               # Next.js (port 3000)
npm run dev:api               # Fastify (port 3001)

# Docker (full stack)
npm run docker:full           # All services in Docker
npm run docker:dev            # Dev mode with hot reload

# Database
npm run db:migrate            # Run migrations
npm run db:generate           # Generate migration

# Sync with upstream
npm run sync:frontend         # Pull from ehr_frontend
npm run sync:backend          # Pull from ehr_backend
```

> **See [DOCKER.md](./DOCKER.md)** for comprehensive Docker setup guide

## API Patterns

**Base URL**: `http://localhost:3001/api`

**Key Endpoints**:
- `POST /api/auth/sign-in` - Login
- `GET /api/patients` - List patients
- `GET /api/patients/:id/encounters` - Patient encounters
- `GET /api/patients/:id/medications` - Patient medications

**Response Format**:
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; };
}
```

## Adding Features

1. **Backend Schema** → `services/api/src/db/schemas/`
2. **Controller** → `services/api/src/controllers/`
3. **Routes** → `services/api/src/routes/`
4. **Shared Types** → `packages/types/src/`
5. **Frontend** → `apps/web/src/`

## Compliance

- **HIPAA**: Audit logging, RBAC, encryption
- **CMS**: HOPE, F2F, 14-day IDG, NOE
- **21 CFR Part 11**: Electronic signatures

## Git Subtree Remotes

- `frontend-upstream` → ehr_frontend
- `backend-upstream` → ehr_backend
