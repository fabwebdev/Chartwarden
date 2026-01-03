# Chartwarden

[![CI](https://github.com/fabwebdev/Chartwarden/actions/workflows/ci.yml/badge.svg)](https://github.com/fabwebdev/Chartwarden/actions/workflows/ci.yml)
[![Deploy](https://github.com/fabwebdev/Chartwarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/fabwebdev/Chartwarden/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/fabwebdev/Chartwarden/branch/main/graph/badge.svg)](https://codecov.io/gh/fabwebdev/Chartwarden)

> **HIPAA-compliant Electronic Health Record (EHR) system for hospice care providers**

A modern, full-stack healthcare management platform built with Next.js 15, React 19, and Fastify, designed specifically for hospice and palliative care organizations.

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/fabwebdev/Chartwarden.git
cd Chartwarden

# Install dependencies
npm install

# Start PostgreSQL & Redis
npm run docker:up

# Configure environment
cp apps/web/.env.example apps/web/.env
cp services/api/.env.example services/api/.env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

**Access Points:**
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:3001
- 🗄️ **pgAdmin**: http://localhost:5050
- 📊 **Redis Commander**: http://localhost:8081

---

## 🏗️ Architecture

**Monorepo Structure:**
```
Chartwarden/
├── apps/
│   └── web/                    # Next.js 15 frontend (Port 3000)
├── services/
│   └── api/                    # Fastify backend (Port 3001)
├── packages/
│   ├── types/                  # @chartwarden/types - Shared TypeScript interfaces
│   └── utils/                  # @chartwarden/utils - Shared utilities
├── infra/                      # Docker configs & deployment scripts
└── .automaker/                 # AutoMaker AI workspace
```

---

## 💻 Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 15.5.9 (App Router)
- **UI Library**: React 19.0.0
- **Styling**: MUI v6 + Tailwind CSS
- **State Management**: Zustand + SWR
- **Forms**: Formik + Yup
- **Auth**: Better Auth
- **Testing**: Jest + Playwright + React Testing Library

### Backend (`services/api`)
- **Framework**: Fastify (high-performance)
- **Database**: PostgreSQL 16 + Drizzle ORM
- **Auth**: Better Auth (cookie-based sessions)
- **Authorization**: RBAC + ABAC + CASL
- **Validation**: Zod
- **Testing**: Jest

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL 16
- **Cache**: Redis
- **Deployment**: Netlify (frontend) + Render/Railway (backend)
- **CI/CD**: GitHub Actions

---

## 📜 Available Scripts

### Development
```bash
npm run dev              # Start all services (frontend + backend)
npm run dev:web          # Start Next.js frontend only
npm run dev:api          # Start Fastify backend only
```

### Building
```bash
npm run build            # Build all workspaces
npm run build:web        # Build frontend for production
npm run build:api        # Build backend for production
```

### Testing
```bash
npm run test             # Run all tests
npm run test:web         # Run frontend unit tests
npm run test:api         # Run backend unit tests
npm run test:e2e         # Run end-to-end tests
npm run test:coverage    # Generate coverage report
```

### Database
```bash
npm run db:migrate       # Run database migrations
npm run db:generate      # Generate new migration
npm run db:studio        # Open Drizzle Studio
```

### Docker
```bash
npm run docker:up        # Start PostgreSQL + Redis
npm run docker:down      # Stop all containers
npm run docker:full      # Start full stack in Docker
npm run docker:dev       # Development mode with hot reload
```

### Repository Sync
```bash
npm run sync:frontend    # Pull from ehr_frontend repo
npm run sync:backend     # Pull from ehr_backend repo
```

---

## 🗂️ Key Features

### Clinical Documentation
- ✅ Electronic Nursing Notes (ENR)
- ✅ Interdisciplinary Group (IDG) Meeting Notes
- ✅ SOAP Note Templates
- ✅ Visit Documentation
- ✅ Clinical Assessments (OASIS, HIS)

### Patient Management
- ✅ Comprehensive Patient Records
- ✅ Medication Management
- ✅ Encounter Tracking
- ✅ Diagnosis & Treatment Plans
- ✅ Document Generation (HIS PDF)

### Billing & Revenue Cycle
- ✅ Claim Management
- ✅ ERA (Electronic Remittance Advice)
- ✅ Denial Management
- ✅ Revenue Tracking
- ✅ Cap Tracking

### Compliance & Reporting
- ✅ HIPAA Compliance
- ✅ Audit Logging
- ✅ CMS HOPE Reporting
- ✅ Quality Metrics (QAPI)
- ✅ Performance Analytics

### Administration
- ✅ User & Role Management (RBAC)
- ✅ Permission System (CASL)
- ✅ Staff Management
- ✅ Organization Settings
- ✅ Real-time Notifications (Socket.IO)

---

## 🔐 Security & Compliance

- **HIPAA Compliant**: Full audit trails, encryption at rest & in transit
- **CMS Certified**: Meets Medicare/Medicaid requirements
- **21 CFR Part 11**: Electronic signatures & records
- **Role-Based Access Control**: Granular permissions system
- **Data Encryption**: AES-256 encryption for sensitive data
- **Secure Authentication**: Cookie-based sessions with CSRF protection

---

## 🧪 Testing

### Unit Tests
```bash
npm run test:web         # Frontend: Jest + React Testing Library
npm run test:api         # Backend: Jest + Supertest
```

### E2E Tests
```bash
npm run test:e2e         # Playwright tests
npm run test:e2e:ui      # Interactive UI mode
npm run test:e2e:headed  # Headed browser mode
```

### Coverage
```bash
npm run test:coverage    # Generate coverage report
```

**Current Test Status:**
- Unit Tests: 64/66 passing (97% pass rate)
- E2E Tests: 60 test scenarios
- Coverage: ~75%

---

## 📦 Deployment

### Frontend (Netlify)
```bash
npm run build:web
netlify deploy --prod
```

### Backend (Docker)
```bash
docker build -f services/api/Dockerfile -t chartwarden-api .
docker run -p 3001:3001 chartwarden-api
```

### Full Stack (Docker Compose)
```bash
docker-compose up -d
```

---

## 🔄 Git Subtree Setup

This monorepo syncs with separate frontend and backend repositories:

```bash
# Frontend sync
git subtree pull --prefix=apps/web frontend-upstream main --squash
git subtree push --prefix=apps/web frontend-upstream main

# Backend sync
git subtree pull --prefix=services/api backend-upstream main --squash
git subtree push --prefix=services/api backend-upstream main
```

**Remotes:**
- `frontend-upstream`: https://github.com/fabwebdev/ehr_frontend.git
- `backend-upstream`: https://github.com/fabwebdev/ehr_backend.git

---

## 🤖 AI Development

This project is optimized for AI-powered development:

- **Claude Code**: Open in Claude Code for AI-assisted development
- **AutoMaker**: `.automaker/` workspace configuration included
- **AI-Friendly**: Comprehensive documentation and type safety

---

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)**: Project overview for AI assistants
- **[DOCKER.md](./DOCKER.md)**: Docker setup & deployment guide
- **Architecture Docs**: Coming soon

---

## 🛠️ Development Requirements

- **Node.js**: ≥20.0.0
- **npm**: ≥10.0.0
- **Docker**: ≥24.0.0 (for local development)
- **PostgreSQL**: 16+ (via Docker or local)
- **Redis**: 7+ (via Docker or local)

---

## 📝 Environment Variables

### Frontend (`apps/web/.env`)
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000
```

### Backend (`services/api/.env`)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/chartwarden
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret
```

See `.env.example` files for complete configuration.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/fabwebdev/Chartwarden/issues)
- **Documentation**: [Wiki](https://github.com/fabwebdev/Chartwarden/wiki)
- **Email**: support@chartwarden.com

---

**Built with ❤️ for hospice care providers - Courtesy of Engrace Hospice LLC**
