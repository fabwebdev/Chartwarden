# Chartwarden

[![CI](https://github.com/fabwebdev/Chartwarden/actions/workflows/ci.yml/badge.svg)](https://github.com/fabwebdev/Chartwarden/actions/workflows/ci.yml)
[![Deploy](https://github.com/fabwebdev/Chartwarden/actions/workflows/deploy.yml/badge.svg)](https://github.com/fabwebdev/Chartwarden/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/fabwebdev/Chartwarden/branch/main/graph/badge.svg)](https://codecov.io/gh/fabwebdev/Chartwarden)

> HIPAA-compliant Electronic Health Record system for hospice care providers

## Quick Start

```bash
# Clone
git clone https://github.com/fabwebdev/Chartwarden.git
cd Chartwarden

# Install
npm install

# Start database
docker-compose up -d

# Configure
cp .env.example .env

# Migrate
npm run db:migrate

# Run
npm run dev
```

## URLs
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- pgAdmin: http://localhost:5050

## Structure
```
apps/web/         # Next.js frontend
services/api/     # Fastify backend
packages/types/   # Shared TypeScript types
packages/utils/   # Shared utilities
```

## Scripts
- `npm run dev` - Start all
- `npm run sync:frontend` - Pull from ehr_frontend
- `npm run sync:backend` - Pull from ehr_backend

## AutoMaker
Open this project in AutoMaker for AI-powered development.
