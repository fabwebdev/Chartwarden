# Contributing to Chartwarden

Thank you for your interest in contributing to Chartwarden! This document provides guidelines and information about our development workflow, CI/CD pipeline, and best practices.

## Table of Contents

- [Development Setup](#development-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Code Quality Standards](#code-quality-standards)
- [Pull Request Process](#pull-request-process)
- [Deployment Process](#deployment-process)
- [Secret Management](#secret-management)
- [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/fabwebdev/Chartwarden.git
cd Chartwarden

# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis)
docker-compose up -d

# Copy environment configuration
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Development URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| pgAdmin | http://localhost:5050 |

## CI/CD Pipeline

Our CI/CD system uses GitHub Actions with two main workflows:

### Continuous Integration (CI)

**Trigger:** Pull requests and pushes to `main` and `develop` branches

**Jobs:**

| Job | Description | Duration |
|-----|-------------|----------|
| `lint` | ESLint and Prettier checks | ~2 min |
| `typecheck` | TypeScript compilation check | ~3 min |
| `test-web` | Web app unit tests with coverage | ~5 min |
| `test-api` | API unit tests with coverage | ~5 min |
| `security` | npm audit and Snyk vulnerability scan | ~3 min |
| `build` | Build all packages | ~5 min |
| `e2e` | Playwright E2E tests | ~10 min |

**Branch Protection:**

The `main` branch requires:
- All CI checks to pass
- At least one approval
- Branch to be up to date

### Continuous Deployment (CD)

**Triggers:**

| Event | Target Environment |
|-------|-------------------|
| Push to `main` | Staging |
| Release published (`v*.*.*`) | Production (with approval) |

**Deployment Flow:**

1. **Build Docker images** for web and API
2. **Push to GitHub Container Registry**
3. **Deploy to target environment**
4. **Run smoke tests**
5. **Send notifications**

## Code Quality Standards

### Linting

We use ESLint with TypeScript support:

```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

We use Prettier for consistent formatting:

```bash
# Check formatting
npm run format:check

# Fix formatting
npm run format
```

### Type Checking

TypeScript is required for all code:

```bash
npm run typecheck
```

### Testing

**Unit Tests:**

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific workspace tests
npm run test:web
npm run test:api
```

**E2E Tests:**

```bash
# Run Playwright tests
npm run test:web:e2e

# Run with UI mode
npx playwright test --ui
```

**Coverage Requirements:**

- Minimum coverage thresholds are enforced
- Coverage reports are uploaded to Codecov
- PRs show coverage diff in comments

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code standards

3. **Run quality checks locally:**
   ```bash
   npm run lint
   npm run typecheck
   npm run test
   ```

4. **Write meaningful commit messages:**
   ```
   feat: add patient medication history view
   fix: resolve date picker timezone issue
   docs: update API endpoint documentation
   ```

### PR Requirements

- [ ] All CI checks pass
- [ ] Code is properly formatted
- [ ] Tests are added/updated for changes
- [ ] Documentation is updated if needed
- [ ] At least one approval from a maintainer

### Review Process

1. Create PR against `main` (or `develop` for features)
2. Fill out the PR template
3. Wait for CI checks to complete
4. Address review feedback
5. Once approved, squash and merge

## Deployment Process

### Staging Deployment

Staging deploys automatically when changes are merged to `main`:

1. CI passes on the merge commit
2. Docker images are built and pushed
3. Staging environment is updated
4. Smoke tests verify the deployment
5. Team is notified via Slack

**Staging URL:** `https://staging.chartwarden.com` (configure in GitHub environment)

### Production Deployment

Production requires a release:

1. **Create a release tag:**
   ```bash
   git tag v1.2.3
   git push origin v1.2.3
   ```

2. **Create GitHub Release:**
   - Go to Releases > Draft a new release
   - Select your tag
   - Write release notes
   - Publish release

3. **Approval Gate:**
   - Production deployments require manual approval
   - Reviewers are notified automatically
   - Approve in GitHub Actions

4. **Deployment:**
   - Docker images are built
   - Database backup is created
   - Production is updated
   - Smoke tests run
   - Team is notified

### Rollback Procedure

If a deployment causes issues:

1. **Quick Rollback:**
   - Revert to previous Docker image tag
   - Run the rollback workflow manually

2. **Database Rollback (if needed):**
   - Restore from pre-deployment backup
   - Run any necessary data migrations

3. **Post-Mortem:**
   - Document what went wrong
   - Create issues for fixes
   - Update procedures if needed

## Secret Management

### GitHub Secrets

Secrets are managed in GitHub Settings > Secrets and variables > Actions.

**Required Secrets:**

| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Codecov upload token |
| `SNYK_TOKEN` | Snyk security scanning token |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook |
| `AWS_ROLE_ARN_STAGING` | AWS role for staging deployment |
| `AWS_ROLE_ARN_PRODUCTION` | AWS role for production deployment |

**Environment Secrets:**

Configure per-environment secrets in GitHub Environments:
- `staging`: Staging-specific credentials
- `production`: Production-specific credentials (with required reviewers)

### Rotating Credentials

1. Generate new credentials in the respective service
2. Update GitHub Secret with new value
3. Verify workflows still function
4. Revoke old credentials

**Never:**
- Commit secrets to the repository
- Log secrets in workflow output
- Share secrets outside of GitHub Secrets

## Troubleshooting

### Common CI Failures

#### Lint Errors

```
Error: ESLint found problems
```

**Solution:** Run `npm run lint:fix` locally and commit the fixes.

#### Test Failures

```
Error: Test suite failed to run
```

**Solution:**
1. Run tests locally: `npm run test`
2. Check for environment-specific issues
3. Ensure all dependencies are up to date

#### Build Failures

```
Error: Build failed
```

**Solution:**
1. Run `npm run build` locally
2. Check for TypeScript errors
3. Verify all imports are correct

#### Docker Build Failures

```
Error: failed to solve: dockerfile parse error
```

**Solution:**
1. Verify Dockerfile syntax
2. Check base image availability
3. Ensure build context is correct

### Deployment Issues

#### Smoke Tests Failing

```
Error: Health check failed
```

**Solution:**
1. Check application logs
2. Verify environment variables
3. Check database connectivity
4. Review recent changes

#### Container Won't Start

**Solution:**
1. Check container logs: `docker logs <container>`
2. Verify environment configuration
3. Check resource limits
4. Review startup dependencies

### Getting Help

- **Slack:** #chartwarden-dev
- **Issues:** Open a GitHub issue with the `ci-cd` label
- **Documentation:** Check the `.github/workflows/` directory

## Modifying Workflows

### Adding a New Job

1. Edit `.github/workflows/ci.yml` or `deploy.yml`
2. Add your job following existing patterns
3. Test in a feature branch first
4. Update this documentation

### Workflow Syntax Reference

```yaml
jobs:
  my-job:
    name: Display Name
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Your step
        run: echo "Hello"
```

### Best Practices

- Use timeouts to prevent hanging jobs
- Cache dependencies when possible
- Use matrix builds for multiple versions
- Keep secrets minimal and scoped
- Document non-obvious steps

---

## Questions?

If you have questions about contributing, please:
1. Check existing documentation
2. Search closed issues
3. Ask in the #chartwarden-dev Slack channel
4. Open a discussion on GitHub

Thank you for contributing to Chartwarden!
