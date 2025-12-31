# =============================================================================
# Makefile for Hospice EHR Backend
# Convenient commands for Docker operations
# =============================================================================

.PHONY: help dev prod up down restart logs build clean migrate seed health test

# Default target
.DEFAULT_GOAL := help

# Docker file paths
DOCKER_DIR := docker
COMPOSE_PROD := $(DOCKER_DIR)/docker-compose.yml
COMPOSE_DEV := $(DOCKER_DIR)/docker-compose.dev.yml
COMPOSE_TEST := $(DOCKER_DIR)/docker-compose.test.yml
DOCKERFILE := $(DOCKER_DIR)/Dockerfile

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

## help: Show this help message
help:
	@echo "$(BLUE)Hospice EHR Backend - Docker Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  make dev              - Start development environment"
	@echo "  make dev-down         - Stop development environment"
	@echo "  make dev-logs         - View development logs"
	@echo "  make dev-migrate      - Run migrations in dev"
	@echo "  make dev-seed         - Seed database in dev"
	@echo ""
	@echo "$(GREEN)Production:$(NC)"
	@echo "  make prod             - Start production environment"
	@echo "  make prod-down        - Stop production environment"
	@echo "  make prod-logs        - View production logs"
	@echo "  make prod-migrate     - Run migrations in prod"
	@echo ""
	@echo "$(GREEN)Common:$(NC)"
	@echo "  make build            - Build Docker images"
	@echo "  make restart          - Restart services"
	@echo "  make logs             - View logs (production)"
	@echo "  make health           - Check service health"
	@echo "  make clean            - Clean up containers and volumes"
	@echo "  make shell            - Open shell in API container"
	@echo "  make db-shell         - Open PostgreSQL shell"
	@echo "  make backup           - Backup database"
	@echo "  make test             - Run tests"
	@echo ""

# =============================================================================
# Development Commands
# =============================================================================

## dev: Start development environment
dev:
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose -f $(COMPOSE_DEV) up -d
	@echo "$(GREEN)Development environment started!$(NC)"
	@echo "$(YELLOW)API:$(NC) http://localhost:8000"
	@echo "$(YELLOW)pgAdmin:$(NC) http://localhost:5050"
	@echo "$(YELLOW)Redis Commander:$(NC) http://localhost:8081"
	@echo "$(YELLOW)Mailhog:$(NC) http://localhost:8025"

## dev-logs: View development logs
dev-logs:
	docker-compose -f $(COMPOSE_DEV) logs -f api

## dev-down: Stop development environment
dev-down:
	@echo "$(RED)Stopping development environment...$(NC)"
	docker-compose -f $(COMPOSE_DEV) down

## dev-migrate: Run migrations in development
dev-migrate:
	@echo "$(GREEN)Running migrations in development...$(NC)"
	docker-compose -f $(COMPOSE_DEV) exec api npm run migrate:run

## dev-seed: Seed database in development
dev-seed:
	@echo "$(GREEN)Seeding database in development...$(NC)"
	docker-compose -f $(COMPOSE_DEV) exec api npm run seed

## dev-rebuild: Rebuild and restart development
dev-rebuild:
	@echo "$(YELLOW)Rebuilding development environment...$(NC)"
	docker-compose -f $(COMPOSE_DEV) up -d --build

# =============================================================================
# Production Commands
# =============================================================================

## prod: Start production environment
prod:
	@echo "$(GREEN)Starting production environment...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(RED)ERROR: .env file not found!$(NC)"; \
		echo "$(YELLOW)Copy docker/.env.docker to .env and configure it first.$(NC)"; \
		exit 1; \
	fi
	docker-compose -f $(COMPOSE_PROD) up -d
	@echo "$(GREEN)Production environment started!$(NC)"
	@echo "$(YELLOW)API:$(NC) http://localhost:8000"

## prod-logs: View production logs
prod-logs:
	docker-compose -f $(COMPOSE_PROD) logs -f api

## prod-down: Stop production environment
prod-down:
	@echo "$(RED)Stopping production environment...$(NC)"
	docker-compose -f $(COMPOSE_PROD) down

## prod-migrate: Run migrations in production
prod-migrate:
	@echo "$(GREEN)Running migrations in production...$(NC)"
	docker-compose -f $(COMPOSE_PROD) exec api npm run migrate:run

## prod-rebuild: Rebuild and restart production
prod-rebuild:
	@echo "$(YELLOW)Rebuilding production environment...$(NC)"
	docker-compose -f $(COMPOSE_PROD) up -d --build

# =============================================================================
# Common Commands
# =============================================================================

## build: Build Docker images
build:
	@echo "$(YELLOW)Building Docker images...$(NC)"
	docker-compose -f $(COMPOSE_PROD) build

## restart: Restart services
restart:
	@echo "$(YELLOW)Restarting services...$(NC)"
	docker-compose -f $(COMPOSE_PROD) restart

## logs: View logs (follow)
logs:
	docker-compose -f $(COMPOSE_PROD) logs -f

## logs-all: View all logs (no follow)
logs-all:
	docker-compose -f $(COMPOSE_PROD) logs

## health: Check service health
health:
	@echo "$(BLUE)Checking service health...$(NC)"
	@docker-compose ps
	@echo ""
	@echo "$(BLUE)API Health Check:$(NC)"
	@curl -s http://localhost:8000/health | jq '.' || echo "$(RED)API not responding$(NC)"

## shell: Open shell in API container
shell:
	@echo "$(BLUE)Opening shell in API container...$(NC)"
	docker-compose -f $(COMPOSE_PROD) exec api sh

## db-shell: Open PostgreSQL shell
db-shell:
	@echo "$(BLUE)Opening PostgreSQL shell...$(NC)"
	docker-compose -f $(COMPOSE_PROD) exec postgres psql -U hospice_user -d hospice_ehr

## db-shell-dev: Open PostgreSQL shell (dev)
db-shell-dev:
	@echo "$(BLUE)Opening PostgreSQL shell (dev)...$(NC)"
	docker-compose -f $(COMPOSE_DEV) exec postgres psql -U hospice_dev -d hospice_ehr_dev

# =============================================================================
# Database Commands
# =============================================================================

## backup: Backup database
backup:
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	@docker-compose -f $(COMPOSE_PROD) exec -T postgres pg_dump -U hospice_user hospice_ehr > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created in backups/ directory$(NC)"

## restore: Restore database (usage: make restore FILE=backups/backup_20240101.sql)
restore:
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)ERROR: Please specify FILE=path/to/backup.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(FILE)...$(NC)"
	docker-compose -f $(COMPOSE_PROD) exec -T postgres psql -U hospice_user hospice_ehr < $(FILE)
	@echo "$(GREEN)Database restored!$(NC)"

# =============================================================================
# Cleanup Commands
# =============================================================================

## clean: Stop containers and remove volumes (DATA LOSS!)
clean:
	@echo "$(RED)WARNING: This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f $(COMPOSE_PROD) down -v; \
		echo "$(GREEN)Cleanup complete!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

## clean-dev: Stop dev containers and remove volumes (DATA LOSS!)
clean-dev:
	@echo "$(RED)WARNING: This will delete all development data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f $(COMPOSE_DEV) down -v; \
		echo "$(GREEN)Development cleanup complete!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

## prune: Remove all unused Docker resources
prune:
	@echo "$(YELLOW)Removing unused Docker resources...$(NC)"
	docker system prune -a --volumes -f
	@echo "$(GREEN)Prune complete!$(NC)"

# =============================================================================
# Testing Commands
# =============================================================================

## test: Run tests in container
test:
	@echo "$(BLUE)Running tests...$(NC)"
	docker-compose -f $(COMPOSE_DEV) exec api npm test

## test-coverage: Run tests with coverage
test-coverage:
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	docker-compose -f $(COMPOSE_DEV) exec api npm run test:coverage

# =============================================================================
# Monitoring Commands
# =============================================================================

## stats: Show resource usage
stats:
	docker stats

## top: Show running processes
top:
	docker-compose top

# =============================================================================
# Setup Commands
# =============================================================================

## setup-dev: Initial setup for development
setup-dev:
	@echo "$(GREEN)Setting up development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp $(DOCKER_DIR)/.env.docker .env; \
		echo "$(GREEN)Created .env file$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists$(NC)"; \
	fi
	@make dev
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	@sleep 10
	@make dev-migrate
	@make dev-seed
	@echo "$(GREEN)Development environment ready!$(NC)"

## setup-prod: Initial setup for production
setup-prod:
	@echo "$(GREEN)Setting up production environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp $(DOCKER_DIR)/.env.docker .env; \
		echo "$(RED)IMPORTANT: Edit .env and update all passwords and secrets!$(NC)"; \
		exit 1; \
	fi
	@make build
	@make prod
	@echo "$(YELLOW)Waiting for services to be ready...$(NC)"
	@sleep 15
	@make prod-migrate
	@echo "$(GREEN)Production environment ready!$(NC)"
	@echo "$(RED)REMINDER: Make sure you updated all passwords in .env!$(NC)"
