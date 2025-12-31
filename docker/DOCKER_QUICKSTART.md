# Docker Quick Start - Hospice EHR Backend

Get up and running with Docker in 5 minutes.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed
- At least 2GB free RAM
- At least 5GB free disk space

## Quick Start (Development)

### Option 1: Using the Init Script (Recommended)

```bash
# Run the initialization script
./docker-init.sh

# Select "1" for Development
# Follow the prompts
```

That's it! The API will be running at http://localhost:8000

### Option 2: Using Make Commands

```bash
# One-time setup
make setup-dev

# View logs
make dev-logs

# Stop services
make dev-down
```

### Option 3: Using Docker Compose Directly

```bash
# 1. Copy environment file
cp .env.docker .env

# 2. Start services
docker-compose -f docker-compose.dev.yml up -d

# 3. Run migrations
docker-compose -f docker-compose.dev.yml exec api npm run migrate:run

# 4. Seed database (optional)
docker-compose -f docker-compose.dev.yml exec api npm run seed
```

## Access Points (Development)

| Service | URL | Credentials |
|---------|-----|-------------|
| **API** | http://localhost:8000 | - |
| **API Health** | http://localhost:8000/health | - |
| **pgAdmin** | http://localhost:5050 | admin@dev.local / admin |
| **Redis Commander** | http://localhost:8081 | - |
| **Mailhog** | http://localhost:8025 | - |

### Connecting to Database (pgAdmin)

1. Open http://localhost:5050
2. Login with `admin@dev.local` / `admin`
3. Add Server:
   - **Name**: Hospice EHR Dev
   - **Host**: `postgres`
   - **Port**: `5432`
   - **Database**: `hospice_ehr_dev`
   - **Username**: `hospice_dev`
   - **Password**: `hospice_dev_pass`

## Common Commands

### View Logs
```bash
# Using Make
make dev-logs

# Using Docker Compose
docker-compose -f docker-compose.dev.yml logs -f api
```

### Restart Services
```bash
# Using Make
make restart

# Using Docker Compose
docker-compose -f docker-compose.dev.yml restart
```

### Stop Services
```bash
# Using Make
make dev-down

# Using Docker Compose
docker-compose -f docker-compose.dev.yml down
```

### Access Container Shell
```bash
# Using Make
make shell

# Using Docker Compose
docker-compose -f docker-compose.dev.yml exec api sh
```

### Run Migrations
```bash
# Using Make
make dev-migrate

# Using Docker Compose
docker-compose -f docker-compose.dev.yml exec api npm run migrate:run
```

### Seed Database
```bash
# Using Make
make dev-seed

# Using Docker Compose
docker-compose -f docker-compose.dev.yml exec api npm run seed
```

## Quick Start (Production)

### ⚠️ IMPORTANT: Production Setup

**Before starting production, you MUST:**
1. Copy `.env.docker` to `.env`
2. Generate secure secrets (see below)
3. Update all passwords in `.env`
4. Configure CORS for your domain

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin secret
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 24

# Generate database password (or use a password manager)
openssl rand -base64 24
```

### Using Make (Recommended)

```bash
# One-time setup
make setup-prod

# View logs
make prod-logs

# Stop services
make prod-down
```

### Using Docker Compose

```bash
# 1. Configure .env (see above)
cp .env.docker .env
nano .env  # Update all secrets!

# 2. Build and start
docker-compose build
docker-compose up -d

# 3. Run migrations
docker-compose exec api npm run migrate:run
```

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 8000
lsof -i :8000

# Change port in .env
API_PORT=8001
```

### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs

# Rebuild images
docker-compose -f docker-compose.dev.yml build --no-cache

# Clean restart
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps postgres

# Check PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Restart PostgreSQL
docker-compose -f docker-compose.dev.yml restart postgres
```

### Out of Disk Space
```bash
# Check Docker disk usage
docker system df

# Clean up (removes unused resources)
docker system prune -a
```

## Hot Reload (Development)

In development mode, code changes automatically restart the server:

```bash
# Edit any file in src/
nano src/routes/api.routes.js

# Server automatically restarts
# Check logs to confirm
docker-compose -f docker-compose.dev.yml logs -f api
```

## Running Tests

```bash
# Using Make
make test

# Using Docker Compose
docker-compose -f docker-compose.dev.yml exec api npm test

# With coverage
docker-compose -f docker-compose.dev.yml exec api npm run test:coverage
```

## Stopping Everything

```bash
# Development
make dev-down
# or
docker-compose -f docker-compose.dev.yml down

# Production
make prod-down
# or
docker-compose down
```

## Clean Up (Remove All Data)

**⚠️ WARNING: This deletes all data!**

```bash
# Development
make clean-dev

# Production
make clean
```

## Next Steps

- Read the full guide: [DOCKER_SETUP.md](DOCKER_SETUP.md)
- View all Make commands: `make help`
- Configure for production: See [Security Best Practices](DOCKER_SETUP.md#security-best-practices)

## Getting Help

- **Health Check**: http://localhost:8000/health
- **View Logs**: `make dev-logs` or `docker-compose -f docker-compose.dev.yml logs -f`
- **Full Documentation**: [DOCKER_SETUP.md](DOCKER_SETUP.md)

---

**Happy Coding! 🚀**
