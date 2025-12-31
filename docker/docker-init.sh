#!/bin/bash

# =============================================================================
# Hospice EHR Backend - Docker Initialization Script
# Quick setup script for first-time Docker deployment
# =============================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║           Hospice EHR Backend - Docker Setup                 ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || {
    echo -e "${RED}Error: Docker is not installed.${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
}

command -v docker-compose >/dev/null 2>&1 || {
    echo -e "${RED}Error: Docker Compose is not installed.${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
}

echo -e "${GREEN}✓ Docker installed: $(docker --version)${NC}"
echo -e "${GREEN}✓ Docker Compose installed: $(docker-compose --version)${NC}"
echo ""

# Environment selection
echo -e "${BLUE}Select environment:${NC}"
echo "1) Development (recommended for local testing)"
echo "2) Production (requires configuration)"
echo ""
read -p "Enter choice [1-2]: " env_choice

case $env_choice in
    1)
        ENV="development"
        COMPOSE_FILE="docker/docker-compose.dev.yml"
        ;;
    2)
        ENV="production"
        COMPOSE_FILE="docker/docker-compose.yml"
        ;;
    *)
        echo -e "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Selected: ${ENV}${NC}"
echo ""

# Check/Create .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp docker/.env.docker .env
    echo -e "${GREEN}✓ .env file created${NC}"

    if [ "$ENV" == "production" ]; then
        echo -e "${RED}"
        echo "╔═══════════════════════════════════════════════════════════════╗"
        echo "║                     IMPORTANT WARNING                         ║"
        echo "╠═══════════════════════════════════════════════════════════════╣"
        echo "║  Before proceeding, you MUST edit the .env file and update:  ║"
        echo "║  - DB_PASSWORD                                                ║"
        echo "║  - REDIS_PASSWORD                                             ║"
        echo "║  - JWT_SECRET                                                 ║"
        echo "║  - ADMIN_CREATION_SECRET                                      ║"
        echo "║                                                               ║"
        echo "║  Use: openssl rand -base64 32                                ║"
        echo "║  to generate secure secrets                                  ║"
        echo "╚═══════════════════════════════════════════════════════════════╝"
        echo -e "${NC}"
        read -p "Press Enter after you've updated .env, or Ctrl+C to exit..."
    fi
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi
echo ""

# Pull images
echo -e "${YELLOW}Pulling Docker images...${NC}"
docker-compose -f $COMPOSE_FILE pull

# Build images
echo -e "${YELLOW}Building Docker images...${NC}"
docker-compose -f $COMPOSE_FILE build

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check service health
echo -e "${YELLOW}Checking service health...${NC}"
docker-compose -f $COMPOSE_FILE ps

# Run migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose -f $COMPOSE_FILE exec -T api npm run migrate:run || {
    echo -e "${RED}Migration failed. Check logs with: docker-compose -f $COMPOSE_FILE logs api${NC}"
    exit 1
}

# Seed database (dev only)
if [ "$ENV" == "development" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    docker-compose -f $COMPOSE_FILE exec -T api npm run seed || {
        echo -e "${YELLOW}Warning: Seeding failed. You can run it manually later.${NC}"
    }
fi

# Success message
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║              Setup Complete! 🎉                               ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}Services:${NC}"
echo -e "  • API:              ${GREEN}http://localhost:8000${NC}"
echo -e "  • Health Check:     ${GREEN}http://localhost:8000/health${NC}"

if [ "$ENV" == "development" ]; then
    echo -e "  • pgAdmin:          ${GREEN}http://localhost:5050${NC}"
    echo -e "  • Redis Commander:  ${GREEN}http://localhost:8081${NC}"
    echo -e "  • Mailhog:          ${GREEN}http://localhost:8025${NC}"
fi

echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  • View logs:        ${YELLOW}docker-compose -f $COMPOSE_FILE logs -f api${NC}"
echo -e "  • Stop services:    ${YELLOW}docker-compose -f $COMPOSE_FILE down${NC}"
echo -e "  • Restart:          ${YELLOW}docker-compose -f $COMPOSE_FILE restart${NC}"
echo -e "  • Shell access:     ${YELLOW}docker-compose -f $COMPOSE_FILE exec api sh${NC}"

if command -v make >/dev/null 2>&1; then
    echo ""
    echo -e "${BLUE}Or use Makefile shortcuts:${NC}"
    echo -e "  • make help         ${YELLOW}Show all available commands${NC}"
    if [ "$ENV" == "development" ]; then
        echo -e "  • make dev-logs     ${YELLOW}View logs${NC}"
        echo -e "  • make dev-down     ${YELLOW}Stop services${NC}"
    else
        echo -e "  • make prod-logs    ${YELLOW}View logs${NC}"
        echo -e "  • make prod-down    ${YELLOW}Stop services${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
