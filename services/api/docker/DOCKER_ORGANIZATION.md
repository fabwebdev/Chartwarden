# Docker Files Organization

All Docker-related files have been organized into the `docker/` directory for better project structure.

## 📁 New Directory Structure

```
ehr_backend-main/
├── docker/                          # All Docker files
│   ├── Dockerfile                   # Multi-stage Docker build
│   ├── docker-compose.yml           # Production setup
│   ├── docker-compose.dev.yml       # Development setup
│   ├── docker-compose.test.yml      # CI/CD testing
│   ├── .env.docker                  # Environment template
│   ├── .dockerignore                # Docker build exclusions (copy)
│   ├── docker-init.sh               # Interactive setup script
│   ├── DOCKER_SETUP.md              # Complete guide
│   ├── DOCKER_QUICKSTART.md         # Quick reference
│   └── README.md                    # Docker directory README
├── .dockerignore                    # Required in root by Docker
├── .github/
│   └── workflows/
│       └── docker-build.yml         # CI/CD pipeline (updated paths)
├── Makefile                         # Convenience commands (updated paths)
├── docker-quickstart                # Quick start wrapper script
└── [rest of project files]
```

## 🚀 How to Use

### From Project Root

All commands work from the project root directory:

#### Option 1: Using the Quick Start Script
```bash
./docker-quickstart
# or
./docker/docker-init.sh
```

#### Option 2: Using Make (Recommended)
```bash
make help           # Show all commands
make setup-dev      # Complete dev setup
make dev            # Start development
make dev-logs       # View logs
make prod           # Start production
```

#### Option 3: Using Docker Compose Directly
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml up -d

# Production
docker-compose -f docker/docker-compose.yml up -d
```

## 📝 What Changed

### Files Moved to `docker/`
- ✅ `Dockerfile` → `docker/Dockerfile`
- ✅ `docker-compose.yml` → `docker/docker-compose.yml`
- ✅ `docker-compose.dev.yml` → `docker/docker-compose.dev.yml`
- ✅ `docker-compose.test.yml` → `docker/docker-compose.test.yml`
- ✅ `.env.docker` → `docker/.env.docker`
- ✅ `docker-init.sh` → `docker/docker-init.sh`
- ✅ `DOCKER_SETUP.md` → `docker/DOCKER_SETUP.md`
- ✅ `DOCKER_QUICKSTART.md` → `docker/DOCKER_QUICKSTART.md`

### Files Updated with New Paths
- ✅ `Makefile` - All docker-compose commands updated
- ✅ `.github/workflows/docker-build.yml` - Dockerfile path updated
- ✅ `docker/docker-init.sh` - Compose file paths updated

### Files Kept in Root
- ✅ `.dockerignore` - Required by Docker in project root
- ✅ `Makefile` - Convenience (works from root)
- ✅ `.env` - Application environment (root is standard)

### New Files
- ✅ `docker/README.md` - Documentation for docker directory
- ✅ `docker-quickstart` - Wrapper script for easy access

## 🔄 Migration Guide

If you have existing Docker containers running:

### 1. Stop Existing Containers
```bash
# Old commands
docker-compose down
docker-compose -f docker-compose.dev.yml down
```

### 2. Use New Commands
```bash
# New commands
make dev-down
# or
docker-compose -f docker/docker-compose.dev.yml down
```

### 3. Start with New Structure
```bash
# Option 1: Quick start
./docker-quickstart

# Option 2: Make
make setup-dev

# Option 3: Docker Compose
docker-compose -f docker/docker-compose.dev.yml up -d
```

## 📚 Documentation Locations

All Docker documentation is now in the `docker/` directory:

1. **Quick Start**: [`docker/DOCKER_QUICKSTART.md`](docker/DOCKER_QUICKSTART.md)
2. **Complete Guide**: [`docker/DOCKER_SETUP.md`](docker/DOCKER_SETUP.md)
3. **Docker Directory**: [`docker/README.md`](docker/README.md)

## 🎯 Benefits of This Organization

1. **Cleaner Root Directory** - Less clutter in project root
2. **Logical Grouping** - All Docker files in one place
3. **Easier Navigation** - Clear separation of concerns
4. **Better Discoverability** - Docker files are easy to find
5. **Maintains Compatibility** - Makefile provides backward compatibility

## ⚡ Quick Reference

### Start Development
```bash
make dev
# or
docker-compose -f docker/docker-compose.dev.yml up -d
```

### View Logs
```bash
make dev-logs
# or
docker-compose -f docker/docker-compose.dev.yml logs -f api
```

### Stop Services
```bash
make dev-down
# or
docker-compose -f docker/docker-compose.dev.yml down
```

### Run Migrations
```bash
make dev-migrate
# or
docker-compose -f docker/docker-compose.dev.yml exec api npm run migrate:run
```

### Access Shell
```bash
make shell
# or
docker-compose -f docker/docker-compose.dev.yml exec api sh
```

## 🆘 Need Help?

- **Quick Start**: Run `./docker-quickstart`
- **All Commands**: Run `make help`
- **Full Documentation**: See `docker/DOCKER_SETUP.md`

---

**All commands still work the same way, just with better organization!** 🎉
