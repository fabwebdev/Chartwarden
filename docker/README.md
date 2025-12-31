# Docker Configuration for Hospice EHR Backend

This directory contains all Docker-related files for the Hospice EHR backend application.

## 📁 Directory Contents

### Core Files
- **`Dockerfile`** - Multi-stage build with production and development targets
- **`docker-compose.yml`** - Production deployment configuration
- **`docker-compose.dev.yml`** - Development environment with hot reload
- **`docker-compose.test.yml`** - CI/CD testing configuration
- **`.dockerignore`** - Files to exclude from Docker builds
- **`.env.docker`** - Environment variable template

### Scripts
- **`docker-init.sh`** - Interactive setup script (run from project root)

### Documentation
- **`DOCKER_SETUP.md`** - Comprehensive Docker setup guide
- **`DOCKER_QUICKSTART.md`** - 5-minute quick start guide

## 🚀 Quick Start

From the **project root** directory:

### Using the Init Script
```bash
./docker/docker-init.sh
```

### Using Make
```bash
make setup-dev        # Development setup
make setup-prod       # Production setup
```

### Using Docker Compose Directly

**Development:**
```bash
cp docker/.env.docker .env
docker-compose -f docker/docker-compose.dev.yml up -d
docker-compose -f docker/docker-compose.dev.yml exec api npm run migrate:run
docker-compose -f docker/docker-compose.dev.yml exec api npm run seed
```

**Production:**
```bash
cp docker/.env.docker .env
# Edit .env and update all secrets!
docker-compose -f docker/docker-compose.yml build
docker-compose -f docker/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml exec api npm run migrate:run
```

## 📚 Documentation

- **Quick Start**: See [`DOCKER_QUICKSTART.md`](./DOCKER_QUICKSTART.md)
- **Complete Guide**: See [`DOCKER_SETUP.md`](./DOCKER_SETUP.md)
- **Makefile Commands**: Run `make help` from project root

## 🏗️ Docker Compose Files

### docker-compose.yml (Production)
- PostgreSQL 16 with optimized settings
- Redis 7 for caching
- API service (production build)
- Optional pgAdmin & Redis Commander

### docker-compose.dev.yml (Development)
- All production services
- Hot reload enabled
- Debug port exposed (9229)
- Source code mounted
- pgAdmin, Redis Commander, Mailhog included

### docker-compose.test.yml (CI/CD)
- Minimal test environment
- Used by GitHub Actions
- Fast startup

## 🔧 Environment Configuration

1. Copy the template:
   ```bash
   cp docker/.env.docker .env
   ```

2. For production, generate secure secrets:
   ```bash
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -base64 32  # ADMIN_CREATION_SECRET
   openssl rand -base64 24  # REDIS_PASSWORD
   ```

3. Update `.env` with your values

## 📊 Image Information

- **Base Image**: node:20-alpine
- **Production Size**: ~350MB (optimized)
- **Development Size**: ~800MB (includes dev dependencies)

## 🔒 Security Features

- Non-root container user (UID 1001)
- Multi-stage build (minimal production image)
- Health checks configured
- Optional password protection for Redis
- Environment-based secrets

## 🌐 Default Ports

| Service | Port | Environment |
|---------|------|-------------|
| API | 8000 | All |
| PostgreSQL | 5432 | All |
| Redis | 6379 | All |
| pgAdmin | 5050 | Dev/Tools |
| Redis Commander | 8081 | Dev/Tools |
| Mailhog SMTP | 1025 | Dev |
| Mailhog UI | 8025 | Dev |
| Debug Port | 9229 | Dev |

## 🧪 Testing

Run tests in container:
```bash
docker-compose -f docker/docker-compose.dev.yml exec api npm test
```

## 🗂️ Volume Mounts

### Development
- `./src` → `/app/src` (hot reload)
- `./logs` → `/app/logs`
- `./storage` → `/app/storage`
- `./uploads` → `/app/uploads`

### Production
- `./logs` → `/app/logs`
- `./storage` → `/app/storage`
- `./uploads` → `/app/uploads`

## 🔄 Common Commands

All commands should be run from the **project root**:

```bash
# Using Make (recommended)
make help              # Show all commands
make dev               # Start development
make dev-logs          # View logs
make prod              # Start production

# Using Docker Compose directly
docker-compose -f docker/docker-compose.dev.yml up -d
docker-compose -f docker/docker-compose.dev.yml logs -f api
docker-compose -f docker/docker-compose.dev.yml down
```

## 📦 Docker Hub

Images are automatically built and pushed to Docker Hub via GitHub Actions when changes are merged to the `main` branch.

## 🆘 Troubleshooting

See [`DOCKER_SETUP.md`](./DOCKER_SETUP.md#troubleshooting) for detailed troubleshooting steps.

## 📝 Notes

- `.dockerignore` is also kept in the project root (Docker requires it there)
- All docker-compose commands should be run from the project root
- The `Makefile` in the project root provides convenient shortcuts

---

**For detailed instructions, see [`DOCKER_SETUP.md`](./DOCKER_SETUP.md)**
