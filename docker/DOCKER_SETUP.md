# Docker Setup Guide - Hospice EHR Backend

Complete guide for running the Hospice EHR backend with Docker.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Development Environment](#development-environment)
5. [Production Environment](#production-environment)
6. [Database Management](#database-management)
7. [Monitoring & Debugging](#monitoring--debugging)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Quick Start

### Development (Fastest Way)

```bash
# 1. Copy environment file
cp .env.docker .env

# 2. Start all services
docker-compose -f docker-compose.dev.yml up -d

# 3. Run database migrations
docker-compose -f docker-compose.dev.yml exec api npm run migrate:run

# 4. (Optional) Seed database
docker-compose -f docker-compose.dev.yml exec api npm run seed

# Access the API at http://localhost:8000
```

### Production

```bash
# 1. Copy and configure environment
cp .env.docker .env
nano .env  # Update passwords and secrets!

# 2. Start services
docker-compose up -d

# 3. Run migrations
docker-compose exec api npm run migrate:run

# Access the API at http://localhost:8000
```

---

## Prerequisites

**Required:**
- Docker 20.10+
- Docker Compose 2.0+
- At least 2GB free RAM
- At least 5GB free disk space

**Check versions:**
```bash
docker --version
docker-compose --version
```

---

## Environment Setup

### 1. Create Environment File

```bash
cp .env.docker .env
```

### 2. Generate Secure Secrets (Production ONLY)

**CRITICAL: Never use default secrets in production!**

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin secret
openssl rand -base64 32

# Generate Redis password
openssl rand -base64 24
```

Update your `.env` file with these generated values:

```bash
JWT_SECRET=<your-generated-jwt-secret>
ADMIN_CREATION_SECRET=<your-generated-admin-secret>
REDIS_PASSWORD=<your-generated-redis-password>
DB_PASSWORD=<your-strong-database-password>
```

### 3. Configure CORS (Production)

Update `CORS_ORIGIN` with your actual frontend domain:

```bash
CORS_ORIGIN=https://your-frontend-domain.com
```

---

## Development Environment

### Start Development Stack

```bash
# Start all development services with hot reload
docker-compose -f docker-compose.dev.yml up

# Start in background (detached mode)
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f api
```

### Development Services

| Service | Port | Access |
|---------|------|--------|
| API | 8000 | http://localhost:8000 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |
| pgAdmin | 5050 | http://localhost:5050 |
| Redis Commander | 8081 | http://localhost:8081 |
| Mailhog UI | 8025 | http://localhost:8025 |
| Mailhog SMTP | 1025 | localhost:1025 |

### Hot Reload

Source code is mounted as a volume. Changes to files will automatically restart the server.

**Mounted directories:**
- `./src` → `/app/src`
- `./server.js` → `/app/server.js`
- `./start.js` → `/app/start.js`

### Running Migrations in Dev

```bash
# Generate new migration
docker-compose -f docker-compose.dev.yml exec api npm run migrate

# Run migrations
docker-compose -f docker-compose.dev.yml exec api npm run migrate:run

# Run seeders
docker-compose -f docker-compose.dev.yml exec api npm run seed
```

### Debugging in Dev

The development container exposes port 9229 for Node.js debugging.

**VS Code `launch.json`:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Docker: Attach to Node",
      "remoteRoot": "/app",
      "localRoot": "${workspaceFolder}",
      "protocol": "inspector",
      "port": 9229,
      "restart": true,
      "address": "localhost",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

---

## Production Environment

### Start Production Stack

```bash
# 1. Build production image
docker-compose build

# 2. Start services
docker-compose up -d

# 3. Run migrations
docker-compose exec api npm run migrate:run

# 4. Check health
docker-compose ps
```

### Production Services

| Service | Port | Description |
|---------|------|-------------|
| API | 8000 | Main application |
| PostgreSQL | 5432 | Database (internal) |
| Redis | 6379 | Cache/sessions (internal) |

### Optional Management Tools

Start pgAdmin and Redis Commander when needed:

```bash
# Start with tools profile
docker-compose --profile tools up -d pgadmin redis-commander

# Access pgAdmin: http://localhost:5050
# Access Redis Commander: http://localhost:8081
```

### Production Optimizations

The production Dockerfile includes:
- ✅ Multi-stage build (smaller image)
- ✅ Non-root user (security)
- ✅ Health checks
- ✅ Only production dependencies
- ✅ Tini init system (proper signal handling)
- ✅ Minimal Alpine Linux base

**Image sizes:**
- Development: ~800MB (includes dev dependencies)
- Production: ~350MB (optimized)

---

## Database Management

### Connect to PostgreSQL

```bash
# Using psql inside container
docker-compose exec postgres psql -U hospice_user -d hospice_ehr

# From host (if PostgreSQL client installed)
psql -h localhost -p 5432 -U hospice_user -d hospice_ehr
```

### Using pgAdmin

1. Open http://localhost:5050
2. Login with credentials from `.env`:
   - Email: `PGADMIN_EMAIL`
   - Password: `PGADMIN_PASSWORD`
3. Add server:
   - Host: `postgres` (for dev) or `postgres` (for prod)
   - Port: `5432`
   - Database: `hospice_ehr`
   - Username: `hospice_user`
   - Password: `DB_PASSWORD` from `.env`

### Backup Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U hospice_user hospice_ehr > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T postgres psql -U hospice_user hospice_ehr < backup_20240101_120000.sql
```

### Database Migrations

```bash
# Check migration status
docker-compose exec api npm run migrate:status

# Generate new migration
docker-compose exec api npm run migrate

# Run pending migrations
docker-compose exec api npm run migrate:run

# Rollback last migration (use carefully!)
docker-compose exec api npm run migrate:down
```

---

## Monitoring & Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 api

# Follow logs with timestamp
docker-compose logs -f -t api
```

### Check Service Health

```bash
# All services status
docker-compose ps

# Check health of specific service
docker inspect hospice-ehr-api | grep -A 10 Health

# API health endpoint
curl http://localhost:8000/health
```

### Enter Container Shell

```bash
# API container
docker-compose exec api sh

# PostgreSQL container
docker-compose exec postgres sh

# As root (for troubleshooting)
docker-compose exec -u root api sh
```

### Monitor Resources

```bash
# Resource usage
docker stats

# Disk usage
docker system df

# Container processes
docker-compose top
```

### Redis Management

**Using Redis Commander UI:**
- Open http://localhost:8081
- Browse keys, view values, execute commands

**Using Redis CLI:**
```bash
# Connect to Redis
docker-compose exec redis redis-cli

# With password (production)
docker-compose exec redis redis-cli -a your_redis_password

# Check keys
> KEYS *
> GET session:12345
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000
# or
netstat -an | grep 8000

# Kill process
kill -9 <PID>

# Or change port in .env
API_PORT=8001
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify credentials
docker-compose exec postgres psql -U hospice_user -d hospice_ehr -c "SELECT 1;"

# Restart PostgreSQL
docker-compose restart postgres
```

### Migration Errors

```bash
# Check database exists
docker-compose exec postgres psql -U hospice_user -l

# Check migration table
docker-compose exec postgres psql -U hospice_user -d hospice_ehr -c "SELECT * FROM drizzle.__drizzle_migrations;"

# Reset migrations (DANGEROUS - destroys data!)
docker-compose exec postgres psql -U hospice_user -d hospice_ehr -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker-compose exec api npm run migrate:run
```

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs api

# Rebuild image
docker-compose build --no-cache api

# Remove and recreate
docker-compose down
docker-compose up -d
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove specific volumes (DANGEROUS - data loss!)
docker volume rm hospice-ehr-postgres-data
docker volume rm hospice-ehr-redis-data
```

### Permission Denied Errors

```bash
# Fix log directory permissions
sudo chown -R 1001:1001 logs storage uploads

# Or run as current user (development only)
# Add to docker-compose.dev.yml:
# user: "${UID}:${GID}"
```

---

## Security Best Practices

### Production Checklist

- [ ] **Change all default passwords and secrets**
- [ ] **Use strong, randomly generated passwords (16+ characters)**
- [ ] **Set `APP_DEBUG=false`**
- [ ] **Restrict `CORS_ORIGIN` to actual frontend domain**
- [ ] **Use HTTPS/TLS in production** (configure reverse proxy)
- [ ] **Never commit `.env` with real credentials**
- [ ] **Implement database backups**
- [ ] **Enable firewall rules**
- [ ] **Use Docker secrets for sensitive data** (advanced)
- [ ] **Regularly update Docker images**
- [ ] **Monitor logs for suspicious activity**
- [ ] **Implement rate limiting**
- [ ] **Use health checks**
- [ ] **Limit container resources** (CPU/memory)

### Securing PostgreSQL

```yaml
# In production, don't expose PostgreSQL port to host
services:
  postgres:
    # Remove or comment out:
    # ports:
    #   - "5432:5432"
```

### Securing Redis

```yaml
# Always use password in production
environment:
  REDIS_PASSWORD: ${REDIS_PASSWORD}
```

### Using Docker Secrets (Advanced)

```yaml
# docker-compose.yml
secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

services:
  api:
    secrets:
      - db_password
      - jwt_secret
```

---

## Useful Commands

### Cleanup

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (DATA LOSS!)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Full cleanup (CAREFUL!)
docker system prune -a --volumes
```

### Restart Services

```bash
# Restart specific service
docker-compose restart api

# Restart all services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

### Update Images

```bash
# Pull latest images
docker-compose pull

# Rebuild custom images
docker-compose build --pull

# Update and restart
docker-compose up -d --build
```

---

## Next Steps

1. **Set up CI/CD** - Automate Docker builds and deployments
2. **Configure reverse proxy** - Use Nginx/Traefik for HTTPS
3. **Set up monitoring** - Prometheus, Grafana, or similar
4. **Implement backups** - Automated daily database backups
5. **Load balancing** - Use Docker Swarm or Kubernetes for scale

---

## Support

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **Repository Issues**: [GitHub Issues](https://github.com/your-org/hospice-ehr/issues)

---

**Last Updated**: 2025-12-27
