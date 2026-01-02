# Docker Setup Guide for Chartwarden

This guide covers the Docker containerization setup for the Chartwarden Hospice EHR System.

## Overview

The Chartwarden project includes comprehensive Docker support for both development and production environments:

- **Multi-stage Dockerfiles** for optimized production builds
- **Development mode** with hot reload for frontend and backend
- **Docker Compose** configurations for easy orchestration
- **Security best practices** (non-root users, minimal images)
- **Health checks** for all services

## Quick Start

### Infrastructure Only (Recommended for Local Development)

Start just the database and Redis, run the app natively:

```bash
npm run docker:up
npm run dev
```

This starts:
- PostgreSQL on port 5433
- Redis on port 6379

### Full Stack (All Services in Docker)

Start everything in Docker (requires building):

```bash
# First time or after code changes
npm run docker:full:build

# Subsequent runs
npm run docker:full
```

This starts:
- PostgreSQL (port 5433)
- Redis (port 6379)
- API Backend (port 3001)
- Web Frontend (port 3000)

### Development Mode (Hot Reload)

For development with live code reloading:

```bash
npm run docker:dev
```

This starts:
- All infrastructure services
- API with hot reload (source code mounted)
- Web with hot reload (source code mounted)
- pgAdmin (port 5050)
- Redis Commander (port 8081)
- Mailhog for email testing (SMTP: 1025, UI: 8025)

## Available Commands

```bash
# Infrastructure only
npm run docker:up              # Start PostgreSQL + Redis
npm run docker:down            # Stop all services
npm run docker:logs            # View logs

# Full stack (production mode)
npm run docker:full            # Start full stack
npm run docker:full:build      # Build and start full stack

# Development mode (with hot reload)
npm run docker:dev             # Start dev environment
npm run docker:dev:build       # Build and start dev environment
npm run docker:dev:down        # Stop dev environment

# Management tools
npm run docker:tools           # Start pgAdmin + Redis Commander

# Cleanup
npm run docker:clean           # Remove all containers and volumes
```

## Docker Compose Files

### docker-compose.yml

Main compose file with service profiles:

**Default services** (no profile):
- `postgres` - PostgreSQL database
- `redis` - Redis cache

**Profile: `full`**
- `api` - Fastify backend (production build)
- `web` - Next.js frontend (production build)

**Profile: `tools`**
- `pgadmin` - Database management UI
- `redis-commander` - Redis management UI

### docker-compose.dev.yml

Development-specific configuration:

**All services with:**
- Hot reload enabled
- Source code mounted as volumes
- Debug ports exposed
- Development dependencies
- Additional tools (Mailhog)

## Architecture

### Frontend Dockerfile (`apps/web/Dockerfile`)

Multi-stage build:

1. **dependencies** - Install npm packages
2. **builder** - Build Next.js app
3. **production** - Minimal runtime image (standalone mode)
4. **development** - Dev mode with hot reload

### Backend Dockerfile (`services/api/Dockerfile`)

Multi-stage build:

1. **dependencies** - Install production dependencies
2. **builder** - Copy and prepare app
3. **production** - Minimal runtime with non-root user
4. **development** - Dev mode with hot reload and debugger

## Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

Key variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=chartwarden
DB_USER=chartwarden
DB_PASSWORD=chartwarden_dev_password

# API
API_PORT=3001
BETTER_AUTH_SECRET=your-secret-here

# Frontend
WEB_PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

**Production Note:** ALWAYS change all passwords and secrets before deploying!

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Web Frontend | 3000 | Next.js application |
| API Backend | 3001 | Fastify API server |
| PostgreSQL | 5433 | Database (mapped from 5432) |
| Redis | 6379 | Cache server |
| pgAdmin | 5050 | Database management UI |
| Redis Commander | 8081 | Redis management UI |
| Mailhog SMTP | 1025 | Email testing (dev only) |
| Mailhog UI | 8025 | Email inbox (dev only) |
| Node Debugger | 9229 | API debugging (dev only) |

## Volumes

Persistent data storage:

**Production:**
- `chartwarden-postgres-data` - Database files
- `chartwarden-redis-data` - Redis persistence
- `chartwarden-api-logs` - API logs
- `chartwarden-api-storage` - File storage
- `chartwarden-api-uploads` - Uploaded files

**Development:**
- Source code is mounted directly (hot reload)
- Separate volumes for dev data

## Health Checks

All services include health checks:

```bash
# Check service health
docker ps

# View health logs
docker inspect --format='{{json .State.Health}}' chartwarden-api
```

## Networking

All services communicate on isolated Docker networks:

- **chartwarden-network** (production)
- **chartwarden-dev-network** (development)

Services can communicate using service names:
- API → `postgres:5432`
- Web → `api:3001`

## Security Features

1. **Non-root users** - All containers run as non-root (uid 1001)
2. **Minimal base images** - Alpine Linux for small attack surface
3. **Multi-stage builds** - No build tools in production images
4. **Health checks** - Automatic service monitoring
5. **Network isolation** - Services on private networks
6. **Volume permissions** - Proper ownership and permissions

## Troubleshooting

### Services won't start

```bash
# Check logs
npm run docker:logs

# Or specific service
docker logs chartwarden-api
```

### Port conflicts

Edit `.env` to change ports:

```env
DB_PORT=5434
API_PORT=3002
WEB_PORT=3001
```

### Build issues

Clean and rebuild:

```bash
# Remove all containers and volumes
npm run docker:clean

# Remove images
docker-compose down --rmi all

# Rebuild from scratch
npm run docker:full:build
```

### Database connection issues

Ensure PostgreSQL is healthy:

```bash
docker ps
# Look for "healthy" status

# Or check logs
docker logs chartwarden-db
```

### Hot reload not working (dev mode)

In `docker-compose.dev.yml`, the web service uses `WATCHPACK_POLLING=true` for Docker compatibility. If still not working:

1. Ensure volumes are mounted correctly
2. Check file permissions
3. Try restarting the service

## Production Deployment

For production:

1. Use `docker-compose.yml` (NOT dev)
2. Set `NODE_ENV=production`
3. Generate strong secrets (min 32 chars)
4. Enable SSL/TLS
5. Restrict CORS origins
6. Use Docker secrets or vault for credentials
7. Configure log aggregation
8. Set up backup strategy for volumes

## Benchmarks & Performance

**Production images:**
- Frontend: ~150MB (alpine + standalone)
- Backend: ~200MB (alpine + production deps)

**Build time (first build):**
- Frontend: ~2-3 minutes
- Backend: ~1-2 minutes

**Startup time:**
- PostgreSQL: ~5-10 seconds
- Redis: ~2-3 seconds
- API: ~10-15 seconds
- Web: ~5-10 seconds

## Next Steps

After running Docker setup:

1. Run database migrations: `npm run db:migrate`
2. Seed initial data (if needed)
3. Access the app at http://localhost:3000
4. Access pgAdmin at http://localhost:5050 (default: admin@chartwarden.local / admin)
5. Monitor logs: `npm run docker:logs`

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)
- [Fastify Docker Best Practices](https://www.fastify.io/docs/latest/Guides/Serverless/)
