#!/bin/bash

# =============================================================================
# Docker Setup Verification Script
# =============================================================================
# This script validates the Docker containerization setup for Chartwarden
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Chartwarden Docker Setup Verification"
echo "=========================================="
echo ""

# Track results
PASSED=0
FAILED=0

# Function to check if a file exists
check_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description exists: $file"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description missing: $file"
        ((FAILED++))
        return 1
    fi
}

# Function to check if docker-compose config is valid
check_compose_config() {
    local file=$1
    local description=$2

    if docker-compose -f "$file" config --quiet 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description is valid"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $description has errors"
        ((FAILED++))
        return 1
    fi
}

echo "1. Checking Required Files"
echo "-------------------------------------------"
check_file "docker-compose.yml" "Main docker-compose file"
check_file "docker-compose.dev.yml" "Development docker-compose file"
check_file "apps/web/Dockerfile" "Frontend Dockerfile"
check_file "services/api/Dockerfile" "Backend Dockerfile"
check_file "apps/web/.dockerignore" "Frontend .dockerignore"
check_file "services/api/.dockerignore" "Backend .dockerignore"
check_file ".env.example" "Environment example file"
check_file "DOCKER.md" "Docker documentation"
echo ""

echo "2. Checking Docker Compose Configurations"
echo "-------------------------------------------"
check_compose_config "docker-compose.yml" "Production compose config"
check_compose_config "docker-compose.dev.yml" "Development compose config"
echo ""

echo "3. Checking Dockerfile Structure"
echo "-------------------------------------------"

# Check frontend Dockerfile stages
if grep -q "FROM node:20-alpine AS dependencies" apps/web/Dockerfile && \
   grep -q "FROM node:20-alpine AS builder" apps/web/Dockerfile && \
   grep -q "FROM node:20-alpine AS production" apps/web/Dockerfile && \
   grep -q "FROM node:20-alpine AS development" apps/web/Dockerfile; then
    echo -e "${GREEN}✓${NC} Frontend Dockerfile has all required stages"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Frontend Dockerfile is missing required stages"
    ((FAILED++))
fi

# Check backend Dockerfile stages
if grep -q "FROM node:20-alpine AS dependencies" services/api/Dockerfile && \
   grep -q "FROM node:20-alpine AS builder" services/api/Dockerfile && \
   grep -q "FROM node:20-alpine AS production" services/api/Dockerfile && \
   grep -q "FROM node:20-alpine AS development" services/api/Dockerfile; then
    echo -e "${GREEN}✓${NC} Backend Dockerfile has all required stages"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Backend Dockerfile is missing required stages"
    ((FAILED++))
fi

# Check for health checks
if grep -q "HEALTHCHECK" apps/web/Dockerfile; then
    echo -e "${GREEN}✓${NC} Frontend Dockerfile includes health check"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Frontend Dockerfile missing health check"
    ((FAILED++))
fi

if grep -q "HEALTHCHECK" services/api/Dockerfile; then
    echo -e "${GREEN}✓${NC} Backend Dockerfile includes health check"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Backend Dockerfile missing health check"
    ((FAILED++))
fi

# Check for non-root user
if grep -q "USER nextjs" apps/web/Dockerfile; then
    echo -e "${GREEN}✓${NC} Frontend runs as non-root user"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Frontend may not use non-root user"
    ((FAILED++))
fi

if grep -q "USER nodejs" services/api/Dockerfile; then
    echo -e "${GREEN}✓${NC} Backend runs as non-root user"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Backend may not use non-root user"
    ((FAILED++))
fi

echo ""

echo "4. Checking Docker Compose Services"
echo "-------------------------------------------"

# Check for required services in docker-compose.yml
if grep -q "postgres:" docker-compose.yml && \
   grep -q "redis:" docker-compose.yml && \
   grep -q "api:" docker-compose.yml && \
   grep -q "web:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} All required services defined in docker-compose.yml"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Missing required services in docker-compose.yml"
    ((FAILED++))
fi

# Check for profiles
if grep -q "profiles:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Docker profiles configured"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} No profiles found (optional)"
fi

# Check for networks
if grep -q "networks:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Networks configured"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} No networks configured"
    ((FAILED++))
fi

# Check for volumes
if grep -q "volumes:" docker-compose.yml; then
    echo -e "${GREEN}✓${NC} Persistent volumes configured"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} No volumes configured"
fi

echo ""

echo "5. Checking Package.json Scripts"
echo "-------------------------------------------"

required_scripts=("docker:up" "docker:down" "docker:full" "docker:dev" "docker:clean")
for script in "${required_scripts[@]}"; do
    if grep -q "\"$script\":" package.json; then
        echo -e "${GREEN}✓${NC} Script '$script' exists"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} Script '$script' missing"
        ((FAILED++))
    fi
done

echo ""

echo "6. Checking Next.js Configuration"
echo "-------------------------------------------"

if grep -q "output: 'standalone'" apps/web/next.config.js; then
    echo -e "${GREEN}✓${NC} Next.js configured for standalone output (Docker optimization)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Next.js not configured for standalone output"
    ((FAILED++))
fi

echo ""

echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Docker setup is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Copy .env.example to .env and configure"
    echo "  2. Run 'npm run docker:up' to start infrastructure"
    echo "  3. Run 'npm run dev' for local development"
    echo "  OR"
    echo "  4. Run 'npm run docker:dev' for full Docker development"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    echo ""
    exit 1
fi
