# Chartwarden EHR - Production Readiness Implementation Plan

**Version**: 1.0
**Created**: 2026-01-02
**Duration**: 12 Weeks (60 Working Days)
**Target Production Date**: 2026-03-27

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Team Structure & Roles](#team-structure--roles)
3. [Phase Overview](#phase-overview)
4. [Detailed Weekly Breakdown](#detailed-weekly-breakdown)
5. [Resource Allocation](#resource-allocation)
6. [Dependencies & Critical Path](#dependencies--critical-path)
7. [Risk Management](#risk-management)
8. [Success Criteria](#success-criteria)
9. [Budget & Cost Management](#budget--cost-management)

---

## Executive Summary

### Objectives
- Achieve production-ready status for Chartwarden EHR system
- Address all critical security vulnerabilities
- Implement comprehensive monitoring and disaster recovery
- Refactor architecture to SOLID principles
- Achieve 90%+ test coverage
- Complete HIPAA compliance requirements

### Key Metrics
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Production Readiness | 65% | 95% | 🟡 In Progress |
| Security Score | 70% | 95% | 🔴 Critical |
| Test Coverage | 75% | 90% | 🟡 Good |
| SOLID Compliance | 60% | 90% | 🟡 Needs Work |
| Documentation | 70% | 95% | 🟡 Good |
| Uptime SLA | N/A | 99.5% | 🔴 Not Ready |

### Timeline
- **Phase 1**: Critical Fixes (Weeks 1-2)
- **Phase 2**: Production Foundation (Weeks 3-6)
- **Phase 3**: Production Hardening (Weeks 7-10)
- **Phase 4**: Production Launch (Weeks 11-12)

---

## Team Structure & Roles

### Core Team (Minimum Required)

#### 1. Backend Lead (1 FTE)
**Responsibilities**:
- Architecture refactoring (Repository, Services, DTOs)
- Transaction management implementation
- API versioning and standardization
- Backend security hardening

**Skills Required**: Node.js, Fastify, PostgreSQL, Drizzle ORM, Design Patterns

---

#### 2. Frontend Lead (1 FTE)
**Responsibilities**:
- Performance optimization (code splitting, lazy loading)
- Security headers and middleware
- PWA implementation
- Accessibility improvements

**Skills Required**: Next.js 15, React 19, TypeScript, Performance Optimization

---

#### 3. DevOps/Infrastructure Engineer (1 FTE)
**Responsibilities**:
- Infrastructure as Code (Terraform)
- CI/CD pipeline completion
- Monitoring setup (Prometheus, Grafana, Sentry)
- Disaster recovery implementation

**Skills Required**: AWS/Azure, Docker, Kubernetes, Terraform, Monitoring Tools

---

#### 4. Security Engineer (0.5 FTE)
**Responsibilities**:
- Security vulnerability remediation
- MFA implementation
- Penetration testing coordination
- Secrets management

**Skills Required**: Application Security, HIPAA, Penetration Testing, Cryptography

---

#### 5. QA Engineer (0.5 FTE)
**Responsibilities**:
- Load testing (k6)
- Security testing (OWASP ZAP)
- Test coverage expansion
- Chaos engineering

**Skills Required**: Jest, Playwright, k6, Security Testing, Automation

---

#### 6. Technical Writer (0.25 FTE)
**Responsibilities**:
- Production runbooks
- API documentation
- Compliance documentation
- Architecture diagrams

**Skills Required**: Technical Writing, Markdown, Diagram Tools

---

### Total Team Size: 4.25 FTE

---

## Phase Overview

### Phase 1: Critical Fixes & Security (Weeks 1-2)
**Objective**: Eliminate critical security vulnerabilities and implement emergency monitoring

**Deliverables**:
- ✅ All secrets rotated and removed from version control
- ✅ CORS wildcard removed
- ✅ CSRF protection enabled in all environments
- ✅ Sentry error tracking operational
- ✅ Automated database backups running
- ✅ Basic Prometheus + Grafana monitoring
- ✅ Production runbook started

**Success Criteria**:
- Zero critical security vulnerabilities
- Database backed up every 6 hours
- Error tracking capturing 100% of exceptions
- Basic dashboards showing system health

---

### Phase 2: Production Foundation (Weeks 3-6)
**Objective**: Refactor architecture, implement core production features

**Deliverables**:
- ✅ Repository Pattern implemented for all entities
- ✅ DTO layer with comprehensive validation
- ✅ Service layer refactored
- ✅ Transaction management operational
- ✅ MFA implemented for admin users
- ✅ Deployment automation complete
- ✅ Database replication configured
- ✅ Load testing framework operational
- ✅ Infrastructure as Code (Terraform) complete

**Success Criteria**:
- All controllers < 50 lines of code
- 100% of endpoints use DTOs
- All multi-table operations use transactions
- Deployment completes in < 10 minutes
- Load tests pass at 500 concurrent users

---

### Phase 3: Production Hardening (Weeks 7-10)
**Objective**: Optimize performance, enhance monitoring, comprehensive testing

**Deliverables**:
- ✅ Distributed tracing (OpenTelemetry) operational
- ✅ Frontend performance optimized (Lighthouse > 90)
- ✅ Comprehensive test suite (90% coverage)
- ✅ Security testing automated
- ✅ API versioning implemented
- ✅ High availability configured
- ✅ Chaos engineering tests passing
- ✅ Complete documentation

**Success Criteria**:
- P95 latency < 200ms
- Frontend Lighthouse score > 90
- Test coverage > 90%
- Zero high-severity security findings
- Mean time to recovery (MTTR) < 15 minutes

---

### Phase 4: Production Launch (Weeks 11-12)
**Objective**: Final validation, compliance audit, production deployment

**Deliverables**:
- ✅ Penetration testing complete
- ✅ HIPAA compliance audit passed
- ✅ Disaster recovery drill successful
- ✅ Production deployment successful
- ✅ All documentation complete
- ✅ Team training complete

**Success Criteria**:
- Penetration test: zero critical findings
- Compliance audit: 100% pass
- DR drill: RTO < 4 hours, RPO < 1 hour
- Production uptime: 100% first 48 hours
- All runbooks validated

---

## Detailed Weekly Breakdown

---

## PHASE 1: CRITICAL FIXES & SECURITY

---

### Week 1: Emergency Security Remediation

#### Monday (Day 1) - Security Audit & Secrets Rotation
**Team**: Security Engineer, Backend Lead, DevOps Engineer

**Morning (4 hours)**
- [ ] **Security Engineer**: Conduct full git history scan for exposed secrets
  ```bash
  # Scan git history
  git log --all --full-history --source -- "*.env" "*.env.*" "*secret*" "*password*"

  # Use git-secrets or truffleHog
  docker run --rm -v $(pwd):/src trufflesecurity/trufflehog:latest filesystem /src
  ```
  - Document all found secrets
  - Create rotation priority list
  - **Deliverable**: `docs/security/secret-audit-2026-01-02.md`

- [ ] **Backend Lead**: Generate new secrets for all services
  ```bash
  # Generate new secrets
  node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
  node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  node -e "console.log('COOKIE_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
  node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
  ```
  - Store in temporary secure location (1Password, LastPass)
  - **Deliverable**: New secrets generated and documented

- [ ] **DevOps Engineer**: Set up AWS Secrets Manager / HashiCorp Vault
  - Create Terraform configuration for Secrets Manager
  - Configure access policies
  - **Deliverable**: `infra/terraform/secrets-manager.tf`

**Afternoon (4 hours)**
- [ ] **All Team**: Coordinate secret rotation
  - Update staging environment first
  - Test all services with new secrets
  - Update production environment
  - Verify all services operational
  - **Deliverable**: All secrets rotated, services operational

- [ ] **Backend Lead**: Remove .env from git tracking
  ```bash
  # Remove from git
  git rm --cached services/api/.env apps/web/.env.local

  # Update .gitignore
  echo -e "\n# Environment files\n*.env\n*.env.*\n!*.env.example" >> .gitignore

  # Commit changes
  git add .gitignore
  git commit -m "security: remove environment files from git tracking"
  ```
  - **Deliverable**: .env files removed from git

**End of Day**:
- [ ] Update `.env.example` files with placeholder values
- [ ] Document secret rotation procedure
- [ ] **Deliverable**: `docs/runbooks/secret-rotation.md`

**Hours**: Backend Lead (8h), Security Engineer (8h), DevOps Engineer (8h)

---

#### Tuesday (Day 2) - CORS & CSRF Fixes

**Team**: Backend Lead, Security Engineer

**Morning (4 hours)**
- [ ] **Backend Lead**: Remove CORS wildcard
  ```javascript
  // services/api/.env.example
  // BEFORE: CORS_ORIGIN=http://localhost:3000,*
  // AFTER: CORS_ORIGIN=http://localhost:3000,http://localhost:3001

  // services/api/src/config/cors.config.js
  export const corsConfig = {
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  };
  ```
  - Update CORS configuration
  - Test with frontend
  - **Deliverable**: CORS wildcard removed, configuration tested

- [ ] **Security Engineer**: Review CORS policy
  - Verify no wildcards in production
  - Document allowed origins
  - **Deliverable**: CORS policy documentation

**Afternoon (4 hours)**
- [ ] **Backend Lead**: Enable CSRF protection in all environments
  ```javascript
  // services/api/src/middleware/csrf.middleware.js
  import { fastifyCsrfProtection } from '@fastify/csrf-protection';

  export async function registerCsrfProtection(app) {
    await app.register(fastifyCsrfProtection, {
      sessionPlugin: '@fastify/cookie',
      cookieKey: 'csrf-token',
      cookieOpts: {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
      }
    });
  }

  export async function csrfAutoProtect(request, reply) {
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    if (!protectedMethods.includes(request.method)) {
      return;
    }

    if (shouldSkipCsrf(request.url)) {
      return;
    }

    // ALWAYS validate - no development bypass
    const csrfToken = request.headers['x-csrf-token'] || request.body?._csrf;

    if (!csrfToken) {
      return reply.code(403).send({
        status: 403,
        error: 'CSRF Token Missing',
        message: 'CSRF token is required for this request.'
      });
    }

    // Verify token
    try {
      await request.csrfProtection(request, reply);
    } catch (error) {
      return reply.code(403).send({
        status: 403,
        error: 'Invalid CSRF Token',
        message: 'CSRF token validation failed.'
      });
    }
  }
  ```
  - Remove development bypass
  - Test all protected endpoints
  - Update frontend to send CSRF tokens
  - **Deliverable**: CSRF protection enabled and tested

**End of Day**:
- [ ] Integration tests for CSRF protection
- [ ] **Deliverable**: `services/api/tests/integration/csrf.test.js`

**Hours**: Backend Lead (8h), Security Engineer (8h)

---

#### Wednesday (Day 3) - Additional Security Hardening

**Team**: Backend Lead, Frontend Lead, Security Engineer

**Morning (4 hours)**
- [ ] **Backend Lead**: Remove console.log statements
  ```bash
  # Find all console.log in production code
  grep -r "console\.log" services/api/src --exclude-dir=node_modules

  # Replace with proper logging
  # BEFORE: console.log('User data:', user);
  # AFTER: logger.info('User action', { userId: user.id, action: 'login' });
  ```
  - Replace all console.log with logger
  - **Deliverable**: Zero console.log in production code

- [ ] **Frontend Lead**: Add security headers to Next.js
  ```typescript
  // apps/web/next.config.js
  const securityHeaders = [
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-XSS-Protection', value: '1; mode=block' },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()'
    }
  ];

  module.exports = {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders,
        },
      ];
    },
  };
  ```
  - **Deliverable**: Security headers configured

- [ ] **Security Engineer**: Install and configure DOMPurify
  ```bash
  cd apps/web
  npm install isomorphic-dompurify
  ```
  - Create sanitization utility
  - **Deliverable**: `apps/web/src/utils/sanitize.ts`

**Afternoon (4 hours)**
- [ ] **Frontend Lead**: Implement DOMPurify sanitization
  ```typescript
  // apps/web/src/utils/sanitize.ts
  import DOMPurify from 'isomorphic-dompurify';

  export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['class', 'id'],
      ALLOW_DATA_ATTR: false,
    });
  };

  // Usage in nursing notes
  // apps/web/src/app/(dashboard)/nursing-notes/[patientId]/[noteId]/page.tsx
  import { sanitizeHtml } from '@/utils/sanitize';

  const SafeNoteContent = ({ content }: { content: string }) => {
    const sanitized = sanitizeHtml(content);
    return <Box dangerouslySetInnerHTML={{ __html: sanitized }} />;
  };
  ```
  - Update all uses of dangerouslySetInnerHTML
  - **Deliverable**: All HTML sanitized

- [ ] **Backend Lead**: Fix cookie secret fallback
  ```javascript
  // services/api/server.js
  const cookieSecret = process.env.COOKIE_SECRET;

  if (!cookieSecret || cookieSecret.length < 32) {
    throw new Error(
      'COOKIE_SECRET must be set and at least 32 characters. ' +
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  app.register(import("@fastify/cookie"), {
    secret: cookieSecret,
    parseOptions: {}
  });
  ```
  - Remove all fallback secrets
  - Validate all required environment variables on startup
  - **Deliverable**: Strict environment validation

**End of Day**:
- [ ] Security testing for all fixes
- [ ] **Deliverable**: Security test report

**Hours**: Backend Lead (8h), Frontend Lead (8h), Security Engineer (8h)

---

#### Thursday (Day 4) - Monitoring Setup (Sentry)

**Team**: DevOps Engineer, Backend Lead, Frontend Lead

**Morning (4 hours)**
- [ ] **DevOps Engineer**: Set up Sentry account and projects
  - Create Sentry organization
  - Create projects: `chartwarden-api`, `chartwarden-web`
  - Configure alerts and integrations
  - **Deliverable**: Sentry projects configured

- [ ] **Backend Lead**: Install and configure Sentry for API
  ```bash
  cd services/api
  npm install @sentry/node @sentry/profiling-node
  ```

  ```javascript
  // services/api/src/config/sentry.config.js
  import * as Sentry from "@sentry/node";
  import { ProfilingIntegration } from "@sentry/profiling-node";

  export function initializeSentry(app) {
    if (!process.env.SENTRY_DSN) {
      console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new ProfilingIntegration(),
      ],
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 0.1,

      beforeSend(event, hint) {
        // Redact PHI from error events
        if (event.request) {
          event.request.cookies = '[Filtered]';
          event.request.headers = {
            ...event.request.headers,
            authorization: '[Filtered]',
            cookie: '[Filtered]',
          };
        }

        // Redact sensitive data from extra context
        if (event.extra) {
          event.extra = redactPHI(event.extra);
        }

        return event;
      },
    });

    // Fastify integration
    app.addHook('onRequest', (request, reply, done) => {
      Sentry.setContext('request', {
        method: request.method,
        url: request.url,
        user_id: request.user?.id,
      });
      done();
    });

    app.setErrorHandler((error, request, reply) => {
      Sentry.captureException(error);
      // Continue with normal error handling
      reply.send(error);
    });
  }

  function redactPHI(data) {
    // Implement PHI redaction logic
    const sensitive = ['ssn', 'medical_record_number', 'date_of_birth'];
    // ... redaction logic
    return data;
  }
  ```
  - **Deliverable**: Sentry integrated in API

**Afternoon (4 hours)**
- [ ] **Frontend Lead**: Install and configure Sentry for Web
  ```bash
  cd apps/web
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```

  ```typescript
  // apps/web/sentry.client.config.ts
  import * as Sentry from "@sentry/nextjs";

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        event.request.cookies = undefined;
      }
      return event;
    },
  });

  // apps/web/sentry.server.config.ts
  import * as Sentry from "@sentry/nextjs";

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
  ```
  - **Deliverable**: Sentry integrated in Web app

- [ ] **DevOps Engineer**: Configure Sentry alerts
  - Set up Slack notifications
  - Configure alert rules (error spikes, performance issues)
  - Set up issue assignment rules
  - **Deliverable**: Alert configuration documented

**End of Day**:
- [ ] Test error tracking end-to-end
- [ ] Trigger test errors and verify in Sentry
- [ ] **Deliverable**: Sentry operational and tested

**Hours**: Backend Lead (8h), Frontend Lead (8h), DevOps Engineer (8h)

---

#### Friday (Day 5) - Database Backup Implementation

**Team**: DevOps Engineer, Backend Lead

**Morning (4 hours)**
- [ ] **DevOps Engineer**: Create backup infrastructure
  ```bash
  # Create S3 bucket for backups
  # infra/terraform/backup-storage.tf
  ```

  ```hcl
  resource "aws_s3_bucket" "database_backups" {
    bucket = "chartwarden-db-backups-${var.environment}"

    tags = {
      Name        = "Chartwarden Database Backups"
      Environment = var.environment
      HIPAA       = "true"
    }
  }

  resource "aws_s3_bucket_versioning" "backup_versioning" {
    bucket = aws_s3_bucket.database_backups.id

    versioning_configuration {
      status = "Enabled"
    }
  }

  resource "aws_s3_bucket_encryption" "backup_encryption" {
    bucket = aws_s3_bucket.database_backups.id

    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }

  resource "aws_s3_bucket_lifecycle_configuration" "backup_lifecycle" {
    bucket = aws_s3_bucket.database_backups.id

    rule {
      id     = "backup-retention"
      status = "Enabled"

      transition {
        days          = 30
        storage_class = "STANDARD_IA"
      }

      transition {
        days          = 90
        storage_class = "GLACIER"
      }

      expiration {
        days = 365
      }
    }
  }
  ```
  - Apply Terraform
  - **Deliverable**: S3 bucket created and configured

- [ ] **Backend Lead**: Create backup script
  ```bash
  # services/api/scripts/backup-database.sh
  #!/bin/bash

  set -e

  # Configuration
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  BACKUP_DIR="/tmp/backups"
  BACKUP_FILE="chartwarden_${TIMESTAMP}.sql.gz"
  S3_BUCKET="${S3_BACKUP_BUCKET}"

  # Ensure backup directory exists
  mkdir -p ${BACKUP_DIR}

  echo "Starting database backup at ${TIMESTAMP}"

  # Create backup
  PGPASSWORD=${DB_PASSWORD} pg_dump \
    -h ${DB_HOST} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --format=custom \
    --compress=9 \
    --verbose \
    --file=${BACKUP_DIR}/${BACKUP_FILE}

  # Calculate checksum
  sha256sum ${BACKUP_DIR}/${BACKUP_FILE} > ${BACKUP_DIR}/${BACKUP_FILE}.sha256

  # Upload to S3
  aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE} s3://${S3_BUCKET}/database/${BACKUP_FILE} \
    --storage-class STANDARD_IA \
    --server-side-encryption AES256

  aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE}.sha256 s3://${S3_BUCKET}/database/${BACKUP_FILE}.sha256

  # Cleanup local backup
  rm ${BACKUP_DIR}/${BACKUP_FILE} ${BACKUP_DIR}/${BACKUP_FILE}.sha256

  echo "Backup completed successfully: ${BACKUP_FILE}"

  # Send notification
  curl -X POST ${SLACK_WEBHOOK_URL} \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"Database backup completed: ${BACKUP_FILE}\"}"
  ```
  - Make script executable
  - **Deliverable**: Backup script created

**Afternoon (4 hours)**
- [ ] **DevOps Engineer**: Set up backup schedule
  ```yaml
  # .github/workflows/database-backup.yml
  name: Database Backup

  on:
    schedule:
      # Every 6 hours
      - cron: '0 */6 * * *'
    workflow_dispatch:

  jobs:
    backup:
      runs-on: ubuntu-latest
      environment: production

      steps:
        - name: Checkout
          uses: actions/checkout@v4

        - name: Configure AWS credentials
          uses: aws-actions/configure-aws-credentials@v4
          with:
            aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
            aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
            aws-region: us-east-1

        - name: Run backup
          env:
            DB_HOST: ${{ secrets.DB_HOST }}
            DB_USER: ${{ secrets.DB_USER }}
            DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
            DB_NAME: ${{ secrets.DB_NAME }}
            S3_BACKUP_BUCKET: ${{ secrets.S3_BACKUP_BUCKET }}
            SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          run: |
            chmod +x services/api/scripts/backup-database.sh
            ./services/api/scripts/backup-database.sh

        - name: Verify backup
          env:
            S3_BACKUP_BUCKET: ${{ secrets.S3_BACKUP_BUCKET }}
          run: |
            LATEST_BACKUP=$(aws s3 ls s3://${S3_BACKUP_BUCKET}/database/ | sort | tail -n 1 | awk '{print $4}')
            BACKUP_SIZE=$(aws s3 ls s3://${S3_BACKUP_BUCKET}/database/${LATEST_BACKUP} | awk '{print $3}')

            if [ "$BACKUP_SIZE" -lt 1000000 ]; then
              echo "Backup size suspiciously small: $BACKUP_SIZE bytes"
              exit 1
            fi

            echo "Backup verification successful: ${LATEST_BACKUP} (${BACKUP_SIZE} bytes)"
  ```
  - **Deliverable**: Automated backup schedule configured

- [ ] **Backend Lead**: Create restore script and documentation
  ```bash
  # services/api/scripts/restore-database.sh
  #!/bin/bash

  set -e

  if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup-filename>"
    echo "Example: ./restore-database.sh chartwarden_20260102_120000.sql.gz"
    exit 1
  fi

  BACKUP_FILE=$1
  S3_BUCKET="${S3_BACKUP_BUCKET}"
  RESTORE_DIR="/tmp/restore"

  mkdir -p ${RESTORE_DIR}

  echo "Downloading backup: ${BACKUP_FILE}"
  aws s3 cp s3://${S3_BUCKET}/database/${BACKUP_FILE} ${RESTORE_DIR}/${BACKUP_FILE}
  aws s3 cp s3://${S3_BUCKET}/database/${BACKUP_FILE}.sha256 ${RESTORE_DIR}/${BACKUP_FILE}.sha256

  # Verify checksum
  echo "Verifying checksum..."
  cd ${RESTORE_DIR}
  sha256sum -c ${BACKUP_FILE}.sha256

  # Confirm restore
  read -p "This will OVERWRITE the current database. Are you sure? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 1
  fi

  # Restore database
  echo "Restoring database..."
  PGPASSWORD=${DB_PASSWORD} pg_restore \
    -h ${DB_HOST} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --clean \
    --if-exists \
    --verbose \
    ${RESTORE_DIR}/${BACKUP_FILE}

  echo "Restore completed successfully"
  ```
  - **Deliverable**: Restore script and documentation

**End of Day**:
- [ ] Test backup and restore procedure
- [ ] Document RTO and RPO
- [ ] **Deliverable**: `docs/runbooks/database-backup-restore.md`

**Hours**: DevOps Engineer (8h), Backend Lead (8h)

---

### Week 2: Monitoring & Initial Documentation

#### Monday (Day 6) - Prometheus & Grafana Setup

**Team**: DevOps Engineer, Backend Lead

**Morning (4 hours)**
- [ ] **DevOps Engineer**: Set up Prometheus
  ```yaml
  # docker-compose.monitoring.yml
  version: '3.8'

  services:
    prometheus:
      image: prom/prometheus:latest
      container_name: chartwarden-prometheus
      ports:
        - "9090:9090"
      volumes:
        - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
        - prometheus-data:/prometheus
      command:
        - '--config.file=/etc/prometheus/prometheus.yml'
        - '--storage.tsdb.path=/prometheus'
        - '--storage.tsdb.retention.time=30d'
      networks:
        - chartwarden-network

    grafana:
      image: grafana/grafana:latest
      container_name: chartwarden-grafana
      ports:
        - "3002:3000"
      volumes:
        - grafana-data:/var/lib/grafana
        - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      environment:
        - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
        - GF_USERS_ALLOW_SIGN_UP=false
      networks:
        - chartwarden-network

  volumes:
    prometheus-data:
    grafana-data:

  networks:
    chartwarden-network:
      external: true
  ```
  - Create prometheus.yml configuration
  - **Deliverable**: Prometheus configured

- [ ] **Backend Lead**: Add Prometheus metrics endpoint
  ```javascript
  // services/api/src/config/metrics.config.js
  import promClient from 'prom-client';

  const register = new promClient.Registry();

  // Default metrics (CPU, memory, etc.)
  promClient.collectDefaultMetrics({ register });

  // Custom metrics
  export const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  });

  export const httpRequestTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
  });

  export const activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections',
    registers: [register],
  });

  export const databaseQueryDuration = new promClient.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  });

  // Export registry
  export { register };

  // Middleware to track metrics
  export function metricsMiddleware(request, reply, done) {
    const start = Date.now();

    activeConnections.inc();

    reply.addHook('onSend', (req, rep, payload, done) => {
      const duration = (Date.now() - start) / 1000;

      httpRequestDuration.observe(
        {
          method: request.method,
          route: request.routeOptions?.url || request.url,
          status_code: reply.statusCode,
        },
        duration
      );

      httpRequestTotal.inc({
        method: request.method,
        route: request.routeOptions?.url || request.url,
        status_code: reply.statusCode,
      });

      activeConnections.dec();

      done();
    });

    done();
  }

  // services/api/src/routes/metrics.routes.js
  import { register } from '../config/metrics.config.js';

  export default async function metricsRoutes(fastify) {
    fastify.get('/metrics', async (request, reply) => {
      reply.type('text/plain');
      return register.metrics();
    });

    fastify.get('/health', async (request, reply) => {
      // Health check endpoint
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
    });
  }
  ```
  - Register metrics middleware
  - **Deliverable**: Prometheus metrics endpoint operational

**Afternoon (4 hours)**
- [ ] **DevOps Engineer**: Create Grafana dashboards
  ```json
  // monitoring/grafana/provisioning/dashboards/api-overview.json
  {
    "dashboard": {
      "title": "Chartwarden API Overview",
      "panels": [
        {
          "title": "Request Rate",
          "targets": [
            {
              "expr": "rate(http_requests_total[5m])"
            }
          ]
        },
        {
          "title": "Request Duration (P95)",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
            }
          ]
        },
        {
          "title": "Error Rate",
          "targets": [
            {
              "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
            }
          ]
        },
        {
          "title": "Active Connections",
          "targets": [
            {
              "expr": "active_connections"
            }
          ]
        },
        {
          "title": "Database Query Duration (P95)",
          "targets": [
            {
              "expr": "histogram_quantile(0.95, rate(database_query_duration_seconds_bucket[5m]))"
            }
          ]
        }
      ]
    }
  }
  ```
  - Create dashboards for: API, Database, System Resources
  - **Deliverable**: Grafana dashboards operational

- [ ] **Backend Lead**: Add business metrics
  ```javascript
  // services/api/src/config/metrics.config.js (continued)
  export const patientsAdmitted = new promClient.Counter({
    name: 'patients_admitted_total',
    help: 'Total number of patients admitted',
    registers: [register],
  });

  export const encountersClosed = new promClient.Counter({
    name: 'encounters_closed_total',
    help: 'Total number of encounters closed',
    registers: [register],
  });

  export const activePatients = new promClient.Gauge({
    name: 'active_patients',
    help: 'Number of currently active patients',
    registers: [register],
  });

  // Usage in controllers
  // services/api/src/controllers/patient/Patient.controller.js
  import { patientsAdmitted, activePatients } from '../../config/metrics.config.js';

  export const create = async (request, reply) => {
    const patient = await patientService.createPatient(request.body);

    // Track metric
    patientsAdmitted.inc();
    activePatients.inc();

    return { success: true, data: patient };
  };
  ```
  - **Deliverable**: Business metrics tracked

**End of Day**:
- [ ] Configure alerts in Grafana
- [ ] Test all dashboards
- [ ] **Deliverable**: Complete monitoring stack operational

**Hours**: DevOps Engineer (8h), Backend Lead (8h)

---

#### Tuesday (Day 7) - Distributed Tracing Setup

**Team**: DevOps Engineer, Backend Lead

**Morning (4 hours)**
- [ ] **DevOps Engineer**: Set up Jaeger
  ```yaml
  # docker-compose.monitoring.yml (add to existing)
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: chartwarden-jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP receiver
      - "4317:4317"    # OTLP gRPC receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - chartwarden-network
  ```
  - Start Jaeger
  - **Deliverable**: Jaeger operational

- [ ] **Backend Lead**: Install OpenTelemetry
  ```bash
  cd services/api
  npm install @opentelemetry/sdk-node \
    @opentelemetry/auto-instrumentations-node \
    @opentelemetry/exporter-trace-otlp-http \
    @opentelemetry/instrumentation-fastify \
    @opentelemetry/instrumentation-pg
  ```

  ```javascript
  // services/api/src/config/tracing.config.js
  import { NodeSDK } from '@opentelemetry/sdk-node';
  import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
  import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
  import { Resource } from '@opentelemetry/resources';
  import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

  export function initializeTracing() {
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    const sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'chartwarden-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
        environment: process.env.NODE_ENV,
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    sdk.start();

    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => console.log('Tracing terminated'))
        .catch((error) => console.log('Error terminating tracing', error))
        .finally(() => process.exit(0));
    });
  }

  // services/api/server.js
  import { initializeTracing } from './src/config/tracing.config.js';

  if (process.env.OTEL_ENABLED === 'true') {
    initializeTracing();
  }
  ```
  - **Deliverable**: OpenTelemetry integrated

**Afternoon (4 hours)**
- [ ] **Backend Lead**: Add custom spans
  ```javascript
  // services/api/src/services/PatientService.js
  import { trace } from '@opentelemetry/api';

  const tracer = trace.getTracer('patient-service');

  export class PatientService {
    async createPatient(patientData) {
      return tracer.startActiveSpan('createPatient', async (span) => {
        try {
          span.setAttributes({
            'patient.type': 'hospice',
            'operation': 'create',
          });

          // Validate
          const validatedData = await tracer.startActiveSpan('validatePatient', async (validateSpan) => {
            const result = await this.validatePatient(patientData);
            validateSpan.end();
            return result;
          });

          // Create in database
          const patient = await tracer.startActiveSpan('insertPatient', async (dbSpan) => {
            dbSpan.setAttribute('db.table', 'patients');
            const result = await this.repository.create(validatedData);
            dbSpan.end();
            return result;
          });

          span.setStatus({ code: 1 }); // OK
          span.end();

          return patient;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: 2, message: error.message }); // ERROR
          span.end();
          throw error;
        }
      });
    }
  }
  ```
  - Add custom spans to critical operations
  - **Deliverable**: Custom tracing implemented

- [ ] **DevOps Engineer**: Configure trace sampling and retention
  - Set sampling rate to 10% in production
  - Configure trace retention (7 days)
  - **Deliverable**: Tracing optimized for production

**End of Day**:
- [ ] Test distributed tracing end-to-end
- [ ] Verify traces in Jaeger UI
- [ ] **Deliverable**: Distributed tracing operational

**Hours**: DevOps Engineer (8h), Backend Lead (8h)

---

#### Wednesday (Day 8) - Frontend Middleware & Authentication

**Team**: Frontend Lead, Backend Lead

**Morning (4 hours)**
- [ ] **Frontend Lead**: Implement authentication middleware
  ```typescript
  // apps/web/src/middleware.ts
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';

  const protectedPaths = [
    '/dashboard',
    '/patients',
    '/admin',
    '/reports',
    '/billing',
    '/clinical',
  ];

  const publicPaths = [
    '/',
    '/login',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
  ];

  export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check if path requires authentication
    const isProtected = protectedPaths.some(path => pathname.startsWith(path));
    const isPublic = publicPaths.some(path => pathname === path || pathname.startsWith(path));

    if (isProtected) {
      // Check for session cookie
      const sessionToken = request.cookies.get('better-auth.session_token');

      if (!sessionToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);

        return NextResponse.redirect(loginUrl);
      }

      // Additional: Verify session with API (optional, adds latency)
      // const isValid = await verifySession(sessionToken.value);
      // if (!isValid) {
      //   return NextResponse.redirect(new URL('/login', request.url));
      // }
    }

    // Redirect authenticated users away from auth pages
    if (isPublic && pathname.startsWith('/login') || pathname.startsWith('/sign-up')) {
      const sessionToken = request.cookies.get('better-auth.session_token');

      if (sessionToken) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Add security headers
    const response = NextResponse.next();

    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    return response;
  }

  export const config = {
    matcher: [
      '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
  };
  ```
  - **Deliverable**: Frontend authentication enforced

- [ ] **Backend Lead**: Create session verification endpoint
  ```javascript
  // services/api/src/routes/auth.routes.js
  app.get('/auth/verify', {
    preHandler: [requireAuth],
    handler: async (request, reply) => {
      return {
        success: true,
        data: {
          authenticated: true,
          user: {
            id: request.user.id,
            email: request.user.email,
            role: request.user.role,
          },
        },
      };
    },
  });
  ```
  - **Deliverable**: Session verification endpoint

**Afternoon (4 hours)**
- [ ] **Frontend Lead**: Implement CSRF token handling
  ```typescript
  // apps/web/src/utils/api.ts
  import axios from 'axios';

  const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
    withCredentials: true,
  });

  // Request interceptor to add CSRF token
  api.interceptors.request.use(async (config) => {
    // Get CSRF token from cookie or API
    let csrfToken = getCookie('csrf-token');

    if (!csrfToken) {
      // Fetch CSRF token
      const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/csrf-token`, {
        withCredentials: true,
      });
      csrfToken = data.token;
    }

    // Add CSRF token to headers for state-changing requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    return config;
  });

  // Response interceptor for error handling
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Redirect to login
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  export default api;

  function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  }
  ```
  - **Deliverable**: CSRF token handling implemented

- [ ] **Frontend Lead**: Update all API calls to use new client
  ```typescript
  // apps/web/src/hooks/usePatients.ts
  import api from '@/utils/api';
  import useSWR from 'swr';

  const fetcher = (url: string) => api.get(url).then(res => res.data);

  export function usePatients() {
    const { data, error, isLoading, mutate } = useSWR('/patients', fetcher);

    return {
      patients: data?.data || [],
      isLoading,
      isError: error,
      refresh: mutate,
    };
  }

  export async function createPatient(patientData: CreatePatientDTO) {
    const response = await api.post('/patients', patientData);
    return response.data;
  }
  ```
  - Update all API calls across the application
  - **Deliverable**: All API calls use CSRF-protected client

**End of Day**:
- [ ] Test authentication flow end-to-end
- [ ] Verify CSRF protection works
- [ ] **Deliverable**: Frontend security hardened

**Hours**: Frontend Lead (8h), Backend Lead (8h)

---

#### Thursday (Day 9) - Documentation Day 1

**Team**: Technical Writer, Backend Lead, DevOps Engineer

**Morning (4 hours)**
- [ ] **Technical Writer**: Create production runbook template
  ```markdown
  # docs/runbooks/TEMPLATE.md
  # Runbook: [Service/Feature Name]

  ## Overview
  Brief description of what this runbook covers.

  ## Prerequisites
  - Required access/permissions
  - Required tools
  - Required knowledge

  ## Normal Operations

  ### Starting the Service
  Step-by-step instructions...

  ### Stopping the Service
  Step-by-step instructions...

  ### Health Checks
  How to verify the service is healthy...

  ## Troubleshooting

  ### Issue 1: [Common Problem]
  **Symptoms**: What you'll see...
  **Diagnosis**: How to confirm this is the issue...
  **Resolution**: Steps to fix...

  ### Issue 2: [Another Problem]
  ...

  ## Monitoring & Alerts
  - Where to find logs
  - Key metrics to watch
  - Alert thresholds

  ## Escalation
  - When to escalate
  - Who to contact
  - What information to provide

  ## References
  - Related documentation
  - External resources
  ```
  - **Deliverable**: Runbook template

- [ ] **Backend Lead**: Write API runbook
  ```markdown
  # docs/runbooks/api-service.md
  # Runbook: Chartwarden API Service

  ## Overview
  The Chartwarden API is a Fastify-based Node.js service running on port 3001.
  It handles all backend operations including patient management, billing, clinical workflows.

  ## Prerequisites
  - Access to production environment
  - AWS credentials configured
  - kubectl configured (for Kubernetes deployments)
  - PostgreSQL client installed

  ## Normal Operations

  ### Starting the Service
  \`\`\`bash
  # Docker
  docker-compose up -d api

  # Kubernetes
  kubectl rollout restart deployment/chartwarden-api -n production

  # PM2 (bare metal)
  pm2 start services/api/ecosystem.config.js --env production
  \`\`\`

  ### Stopping the Service
  \`\`\`bash
  # Docker
  docker-compose stop api

  # Kubernetes
  kubectl scale deployment/chartwarden-api --replicas=0 -n production

  # PM2
  pm2 stop chartwarden-api
  \`\`\`

  ### Health Checks
  \`\`\`bash
  # Health endpoint
  curl http://localhost:3001/health

  # Expected response:
  {
    "status": "healthy",
    "timestamp": "2026-01-02T12:00:00.000Z",
    "uptime": 86400,
    "memory": {...}
  }

  # Database connectivity
  curl http://localhost:3001/health/db

  # Redis connectivity
  curl http://localhost:3001/health/redis
  \`\`\`

  ## Troubleshooting

  ### Issue 1: High Response Times
  **Symptoms**: API responses taking > 1 second, Grafana showing P95 > 500ms

  **Diagnosis**:
  1. Check Grafana dashboard for slow endpoints
  2. Check database query performance:
     \`\`\`sql
     SELECT query, mean_exec_time, calls
     FROM pg_stat_statements
     ORDER BY mean_exec_time DESC
     LIMIT 10;
     \`\`\`
  3. Check for N+1 queries in logs

  **Resolution**:
  1. Add database indexes if missing
  2. Implement caching for frequently accessed data
  3. Optimize Drizzle queries
  4. Scale horizontally if needed

  ### Issue 2: Database Connection Pool Exhausted
  **Symptoms**: Errors "remaining connection slots are reserved", timeouts

  **Diagnosis**:
  \`\`\`bash
  # Check current connections
  SELECT count(*) FROM pg_stat_activity WHERE datname = 'chartwarden';

  # Check pool configuration
  echo $DB_POOL_SIZE
  \`\`\`

  **Resolution**:
  1. Identify and kill long-running queries
  2. Increase pool size (DB_POOL_SIZE environment variable)
  3. Restart API service to reset connections

  ### Issue 3: Memory Leak
  **Symptoms**: Gradual memory increase, eventual OOM crash

  **Diagnosis**:
  1. Check Grafana memory usage graph
  2. Take heap snapshot:
     \`\`\`bash
     kill -USR2 $(pgrep -f "node.*server.js")
     \`\`\`
  3. Analyze with Chrome DevTools

  **Resolution**:
  1. Restart service immediately to recover
  2. Analyze heap snapshot to identify leak source
  3. Fix code and deploy patch

  ## Monitoring & Alerts

  ### Dashboards
  - Grafana: http://grafana.internal/d/api-overview
  - Sentry: https://sentry.io/chartwarden/api
  - Jaeger: http://jaeger.internal/search

  ### Key Metrics
  - Request rate: Should be < 1000 req/s normally
  - P95 latency: Should be < 200ms
  - Error rate: Should be < 0.1%
  - Memory usage: Should be < 80% of limit
  - Active connections: Should be < 80% of pool size

  ### Alert Thresholds
  - P95 latency > 500ms for 5 minutes → WARNING
  - P95 latency > 1000ms for 5 minutes → CRITICAL
  - Error rate > 1% for 5 minutes → CRITICAL
  - Memory usage > 90% → WARNING
  - Memory usage > 95% → CRITICAL

  ## Escalation

  ### When to Escalate
  - Unable to resolve issue within 30 minutes
  - Data integrity concerns
  - HIPAA breach suspected
  - Multiple services affected

  ### Who to Contact
  1. On-call engineer (PagerDuty)
  2. Backend Lead: backend-lead@chartwarden.com
  3. CTO: cto@chartwarden.com (critical issues only)

  ### Information to Provide
  - Incident timeline
  - Error messages and logs
  - Affected endpoints/users
  - Steps taken so far
  - Current system state (Grafana screenshots)

  ## References
  - [API Documentation](./api-documentation.md)
  - [Database Schema](./database-schema.md)
  - [Deployment Guide](./deployment.md)
  - [Disaster Recovery](./disaster-recovery.md)
  ```
  - **Deliverable**: Complete API runbook

**Afternoon (4 hours)**
- [ ] **DevOps Engineer**: Write infrastructure runbook
  ```markdown
  # docs/runbooks/infrastructure.md
  # Runbook: Infrastructure Operations

  ## Overview
  Chartwarden infrastructure is deployed on AWS using Terraform.

  ## Components
  - RDS PostgreSQL 16 (Multi-AZ)
  - ElastiCache Redis (Cluster mode)
  - ECS Fargate (API containers)
  - CloudFront + S3 (Web app)
  - ALB (Application Load Balancer)

  ## Terraform Operations

  ### Applying Changes
  \`\`\`bash
  cd infra/terraform

  # Plan changes
  terraform plan -var-file=environments/production.tfvars -out=tfplan

  # Review plan carefully
  terraform show tfplan

  # Apply
  terraform apply tfplan
  \`\`\`

  ### Viewing Current State
  \`\`\`bash
  # List all resources
  terraform state list

  # Show specific resource
  terraform state show aws_db_instance.chartwarden_postgres
  \`\`\`

  ## Database Operations

  ### Scaling RDS Instance
  \`\`\`bash
  # Update instance class in terraform
  # infra/terraform/rds.tf
  resource "aws_db_instance" "chartwarden_postgres" {
    instance_class = "db.r6g.xlarge"  # Update this
  }

  # Apply changes (will cause brief downtime)
  terraform apply
  \`\`\`

  ### Accessing Database
  \`\`\`bash
  # Via bastion host
  ssh -L 5432:chartwarden-db.xxxxx.us-east-1.rds.amazonaws.com:5432 ec2-user@bastion.chartwarden.com

  # Connect locally
  psql -h localhost -U chartwarden -d chartwarden
  \`\`\`

  ## Redis Operations

  ### Flushing Cache
  \`\`\`bash
  # Connect to Redis
  redis-cli -h chartwarden-redis.xxxxx.cache.amazonaws.com

  # Flush all
  FLUSHALL

  # Flush specific database
  SELECT 0
  FLUSHDB
  \`\`\`

  ## Troubleshooting

  ### Issue: RDS Storage Full
  **Symptoms**: Write failures, "disk full" errors

  **Resolution**:
  1. Check current usage:
     \`\`\`sql
     SELECT pg_size_pretty(pg_database_size('chartwarden'));
     \`\`\`
  2. Increase storage in Terraform
  3. Apply changes (no downtime for storage increase)

  ### Issue: High Database CPU
  **Symptoms**: Slow queries, timeouts

  **Diagnosis**:
  1. Check RDS Performance Insights
  2. Identify expensive queries

  **Resolution**:
  1. Add missing indexes
  2. Optimize queries
  3. Scale up instance if needed

  ## References
  - [Terraform Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
  - [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
  ```
  - **Deliverable**: Infrastructure runbook

**End of Day**:
- [ ] Review runbooks with team
- [ ] **Deliverable**: Two production runbooks complete

**Hours**: Technical Writer (8h), Backend Lead (4h), DevOps Engineer (4h)

---

#### Friday (Day 10) - Week 2 Wrap-up & Testing

**Team**: All

**Morning (4 hours)**
- [ ] **All Team**: Test all Week 1-2 deliverables
  - [ ] Verify all secrets rotated
  - [ ] Verify CORS/CSRF protection
  - [ ] Test error tracking (trigger test errors)
  - [ ] Test database backup/restore
  - [ ] Test monitoring dashboards
  - [ ] Test distributed tracing
  - [ ] Test frontend authentication
  - [ ] Review documentation

**Afternoon (4 hours)**
- [ ] **All Team**: Week 2 retrospective
  - What went well?
  - What didn't go well?
  - What should we change?
  - **Deliverable**: Retrospective notes

- [ ] **All Team**: Plan Phase 2 (Weeks 3-6)
  - Review Phase 2 objectives
  - Assign tasks
  - Identify risks
  - **Deliverable**: Phase 2 kickoff plan

**End of Day**:
- [ ] **All Team**: Demo all Phase 1 deliverables
- [ ] **Deliverable**: Phase 1 completion report

**Hours**: All team (8h each)

---

## PHASE 2: PRODUCTION FOUNDATION

---

### Week 3: Architecture Refactoring Begins

#### Monday (Day 11) - Repository Pattern Implementation

**Team**: Backend Lead, 1 Junior Developer (if available)

**Morning (4 hours)**
- [ ] **Backend Lead**: Create base repository class
  ```javascript
  // services/api/src/repositories/BaseRepository.js
  import { eq, and, or, inArray, isNull, sql } from 'drizzle-orm';
  import { db } from '../config/db.drizzle.js';

  export class BaseRepository {
    constructor(table) {
      this.table = table;
      this.db = db;
    }

    /**
     * Find a single record by ID
     */
    async findById(id, tx = this.db) {
      const [result] = await tx
        .select()
        .from(this.table)
        .where(eq(this.table.id, id))
        .limit(1);

      return result || null;
    }

    /**
     * Find all records matching filters
     */
    async findAll(filters = {}, tx = this.db) {
      let query = tx.select().from(this.table);

      // Apply filters
      const whereConditions = this.buildWhereClause(filters);
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      // Apply pagination
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.offset(filters.offset);
      }

      // Apply sorting
      if (filters.orderBy) {
        query = query.orderBy(filters.orderBy);
      }

      return await query;
    }

    /**
     * Count records matching filters
     */
    async count(filters = {}, tx = this.db) {
      let query = tx
        .select({ count: sql`count(*)::int` })
        .from(this.table);

      const whereConditions = this.buildWhereClause(filters);
      if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
      }

      const [result] = await query;
      return result?.count || 0;
    }

    /**
     * Create a new record
     */
    async create(data, tx = this.db) {
      const [result] = await tx
        .insert(this.table)
        .values({
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      return result;
    }

    /**
     * Update a record by ID
     */
    async update(id, data, tx = this.db) {
      const [result] = await tx
        .update(this.table)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(this.table.id, id))
        .returning();

      return result || null;
    }

    /**
     * Delete a record by ID (soft delete if column exists)
     */
    async delete(id, tx = this.db) {
      // Check if table has deleted_at column
      if ('deleted_at' in this.table) {
        return await this.update(id, { deleted_at: new Date() }, tx);
      }

      // Hard delete
      const [result] = await tx
        .delete(this.table)
        .where(eq(this.table.id, id))
        .returning();

      return result || null;
    }

    /**
     * Bulk create
     */
    async bulkCreate(dataArray, tx = this.db) {
      const results = await tx
        .insert(this.table)
        .values(dataArray.map(data => ({
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
        })))
        .returning();

      return results;
    }

    /**
     * Build WHERE clause from filters
     * Override in child classes for custom logic
     */
    buildWhereClause(filters) {
      const conditions = [];

      for (const [key, value] of Object.entries(filters)) {
        // Skip pagination/sorting params
        if (['limit', 'offset', 'orderBy'].includes(key)) {
          continue;
        }

        if (!(key in this.table)) {
          continue;
        }

        const column = this.table[key];

        if (value === null) {
          conditions.push(isNull(column));
        } else if (Array.isArray(value)) {
          conditions.push(inArray(column, value));
        } else if (typeof value === 'object' && value.operator) {
          // Handle complex filters: { operator: 'gt', value: 10 }
          switch (value.operator) {
            case 'gt':
              conditions.push(sql`${column} > ${value.value}`);
              break;
            case 'gte':
              conditions.push(sql`${column} >= ${value.value}`);
              break;
            case 'lt':
              conditions.push(sql`${column} < ${value.value}`);
              break;
            case 'lte':
              conditions.push(sql`${column} <= ${value.value}`);
              break;
            case 'like':
              conditions.push(sql`${column} ILIKE ${`%${value.value}%`}`);
              break;
          }
        } else {
          conditions.push(eq(column, value));
        }
      }

      return conditions;
    }
  }
  ```
  - **Deliverable**: BaseRepository class complete

**Afternoon (4 hours)**
- [ ] **Backend Lead**: Create PatientRepository
  ```javascript
  // services/api/src/repositories/PatientRepository.js
  import { BaseRepository } from './BaseRepository.js';
  import { patients } from '../db/schemas/patient.schema.js';
  import { eq, sql, and, or, ilike } from 'drizzle-orm';

  export class PatientRepository extends BaseRepository {
    constructor() {
      super(patients);
    }

    /**
     * Find patient by Medical Record Number
     */
    async findByMRN(mrn, tx = this.db) {
      const [result] = await tx
        .select()
        .from(this.table)
        .where(eq(patients.medical_record_number, mrn))
        .limit(1);

      return result || null;
    }

    /**
     * Find patients by SSN (for duplicate detection)
     */
    async findBySSN(ssn, tx = this.db) {
      const results = await tx
        .select()
        .from(this.table)
        .where(eq(patients.ssn, ssn));

      return results;
    }

    /**
     * Find active patients
     */
    async findActivePatients(tx = this.db) {
      return await tx
        .select()
        .from(this.table)
        .where(
          and(
            eq(patients.status, 'active'),
            sql`${patients.deleted_at} IS NULL`
          )
        );
    }

    /**
     * Search patients by name or MRN
     */
    async search(searchTerm, limit = 20, tx = this.db) {
      const pattern = `%${searchTerm}%`;

      return await tx
        .select()
        .from(this.table)
        .where(
          and(
            or(
              ilike(patients.first_name, pattern),
              ilike(patients.last_name, pattern),
              ilike(patients.medical_record_number, pattern)
            ),
            sql`${patients.deleted_at} IS NULL`
          )
        )
        .limit(limit);
    }

    /**
     * Get patient with full demographics
     */
    async findByIdWithDemographics(id, tx = this.db) {
      const [result] = await tx
        .select({
          id: patients.id,
          firstName: patients.first_name,
          lastName: patients.last_name,
          middleName: patients.middle_name,
          dateOfBirth: patients.date_of_birth,
          gender: patients.gender,
          ssn: patients.ssn,
          medicalRecordNumber: patients.medical_record_number,
          status: patients.status,
          createdAt: patients.created_at,
          updatedAt: patients.updated_at,
        })
        .from(this.table)
        .where(eq(patients.id, id))
        .limit(1);

      return result || null;
    }

    /**
     * Get patients admitted in date range
     */
    async findByAdmissionDateRange(startDate, endDate, tx = this.db) {
      return await tx
        .select()
        .from(this.table)
        .where(
          and(
            sql`${patients.admission_date} >= ${startDate}`,
            sql`${patients.admission_date} <= ${endDate}`,
            sql`${patients.deleted_at} IS NULL`
          )
        );
    }
  }

  // Export singleton instance
  export default new PatientRepository();
  ```
  - **Deliverable**: PatientRepository complete

**End of Day**:
- [ ] Write unit tests for repositories
- [ ] **Deliverable**: `services/api/tests/unit/repositories/PatientRepository.test.js`

**Hours**: Backend Lead (8h)

---

#### Tuesday (Day 12) - More Repositories

**Team**: Backend Lead

**Full Day (8 hours)**
- [ ] Create additional repositories following the same pattern:
  - [ ] **EncounterRepository**
  - [ ] **MedicationRepository**
  - [ ] **UserRepository**
  - [ ] **CareTeamRepository**
  - [ ] **AssessmentRepository**

  Example structure:
  ```javascript
  // services/api/src/repositories/EncounterRepository.js
  export class EncounterRepository extends BaseRepository {
    constructor() {
      super(encounters);
    }

    async findByPatientId(patientId, tx = this.db) {
      return await tx
        .select()
        .from(this.table)
        .where(eq(encounters.patient_id, patientId))
        .orderBy(desc(encounters.encounter_date));
    }

    async findActiveEncounters(tx = this.db) {
      return await tx
        .select()
        .from(this.table)
        .where(
          and(
            eq(encounters.status, 'active'),
            isNull(encounters.closed_at)
          )
        );
    }

    // ... more custom methods
  }
  ```

- [ ] Create repository barrel export
  ```javascript
  // services/api/src/repositories/index.js
  export { default as PatientRepository } from './PatientRepository.js';
  export { default as EncounterRepository } from './EncounterRepository.js';
  export { default as MedicationRepository } from './MedicationRepository.js';
  export { default as UserRepository } from './UserRepository.js';
  export { default as CareTeamRepository } from './CareTeamRepository.js';
  export { default as AssessmentRepository } from './AssessmentRepository.js';
  ```

- [ ] **Deliverable**: 6 repositories implemented with tests

**Hours**: Backend Lead (8h)

---

*(Continuing with detailed daily breakdown...)*

---

## NOTE: Complete Plan Continuation

Due to the extensive nature of this plan, I'll continue with key highlights for remaining weeks:

### Weeks 3-6 Summary (Phase 2)
- **Week 3**: Repository Pattern, DTO Layer, Service Layer refactoring
- **Week 4**: Transaction management, MFA implementation, API standardization
- **Week 5**: Deployment automation, Infrastructure as Code (Terraform)
- **Week 6**: Load testing, Database replication, High availability

### Weeks 7-10 Summary (Phase 3)
- **Week 7**: Frontend performance optimization, Code splitting
- **Week 8**: Comprehensive testing (chaos, security, accessibility)
- **Week 9**: API versioning, Webhooks, Advanced features
- **Week 10**: Documentation completion, Team training

### Weeks 11-12 Summary (Phase 4)
- **Week 11**: Penetration testing, HIPAA compliance audit
- **Week 12**: Disaster recovery drill, Production deployment

---

## Dependencies & Critical Path

### Critical Path Items (Must Complete in Order)
1. **Week 1-2**: Security fixes → Monitoring setup
2. **Week 3-4**: Architecture refactoring → Transaction support
3. **Week 5**: Infrastructure as Code → Deployment automation
4. **Week 6**: Database replication → High availability
5. **Week 11**: Penetration test → Compliance audit
6. **Week 12**: DR drill → Production launch

### Parallel Work Streams
- **Security**: Weeks 1-2, 8, 11
- **Architecture**: Weeks 3-4
- **Infrastructure**: Weeks 5-6, 7
- **Testing**: Weeks 6, 8-9
- **Documentation**: Weeks 2, 4, 6, 8, 10

---

## Risk Management

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Penetration test finds critical issues | Medium | High | Schedule early (Week 11), buffer time for fixes |
| Database migration issues | Medium | Critical | Test migrations thoroughly, have rollback plan |
| Team availability | High | Medium | Cross-train team members, document everything |
| Third-party service downtime | Low | High | Have alternatives, implement circuit breakers |
| Scope creep | High | Medium | Strict change control, maintain backlog |

### Mitigation Strategies
- **Weekly checkpoints**: Review progress, adjust as needed
- **Buffer time**: 10% buffer built into each phase
- **Rollback plans**: Every deployment has rollback procedure
- **Knowledge sharing**: Pair programming, code reviews, documentation

---

## Success Criteria

### Phase 1 Success Criteria
- [ ] Zero critical security vulnerabilities (Snyk, npm audit)
- [ ] Database backups running every 6 hours
- [ ] Error tracking operational (Sentry capturing 100% errors)
- [ ] Basic monitoring dashboards functional

### Phase 2 Success Criteria
- [ ] All controllers < 50 lines (business logic in services)
- [ ] 100% of endpoints use DTO validation
- [ ] All multi-table operations use transactions
- [ ] MFA functional for admin users
- [ ] Deployment automation complete
- [ ] Load tests pass at 500 concurrent users

### Phase 3 Success Criteria
- [ ] Frontend Lighthouse score > 90
- [ ] Test coverage > 90%
- [ ] P95 latency < 200ms
- [ ] Zero high-severity security findings
- [ ] Complete documentation suite

### Phase 4 Success Criteria
- [ ] Penetration test: zero critical findings
- [ ] HIPAA compliance audit: 100% pass
- [ ] DR drill: RTO < 4 hours, RPO < 1 hour
- [ ] Production uptime: 100% first 48 hours

---

## Budget & Cost Management

### Team Costs (12 weeks)
| Role | FTE | Rate | Total |
|------|-----|------|-------|
| Backend Lead | 1.0 | $150k/year | $34,615 |
| Frontend Lead | 1.0 | $140k/year | $32,308 |
| DevOps Engineer | 1.0 | $160k/year | $36,923 |
| Security Engineer | 0.5 | $170k/year | $19,615 |
| QA Engineer | 0.5 | $120k/year | $13,846 |
| Technical Writer | 0.25 | $100k/year | $5,769 |
| **Total** | **4.25 FTE** | | **$143,076** |

### Infrastructure Costs (3 months)
| Service | Monthly Cost | 3 Months |
|---------|--------------|----------|
| AWS RDS (PostgreSQL) | $250 | $750 |
| ElastiCache (Redis) | $75 | $225 |
| ECS Fargate | $300 | $900 |
| Load Balancer | $40 | $120 |
| S3 + CloudFront | $50 | $150 |
| CloudWatch | $50 | $150 |
| Sentry | $50 | $150 |
| DataDog | $30 | $90 |
| **Total** | **$845/month** | **$2,535** |

### One-Time Costs
| Item | Cost |
|------|------|
| Penetration Testing | $10,000 |
| HIPAA Compliance Audit | $5,000 |
| Security Consulting | $3,000 |
| **Total** | **$18,000** |

### Grand Total: $163,611

---

## Deliverables Checklist

### Week-by-Week Deliverables

#### Week 1
- [ ] All secrets rotated
- [ ] CORS wildcard removed
- [ ] CSRF protection enabled
- [ ] Sentry error tracking operational
- [ ] Database backup script

#### Week 2
- [ ] Prometheus + Grafana operational
- [ ] Distributed tracing (Jaeger)
- [ ] Frontend authentication middleware
- [ ] Production runbooks started

#### Week 3-4
- [ ] Repository Pattern (8+ repositories)
- [ ] DTO layer (Zod schemas)
- [ ] Service layer refactored
- [ ] Transaction management
- [ ] MFA implementation

#### Week 5-6
- [ ] Terraform infrastructure
- [ ] Deployment automation
- [ ] Load testing framework
- [ ] Database replication
- [ ] High availability config

#### Week 7-8
- [ ] Frontend optimization (Lighthouse > 90)
- [ ] Code splitting
- [ ] Test coverage > 90%
- [ ] Security testing automated

#### Week 9-10
- [ ] API versioning
- [ ] Complete documentation
- [ ] Team training materials

#### Week 11-12
- [ ] Penetration test complete
- [ ] Compliance audit passed
- [ ] DR drill successful
- [ ] Production deployment

---

## Conclusion

This 12-week plan transforms Chartwarden from 65% production-ready to 95% production-ready through systematic implementation of security, architecture, monitoring, and operational improvements.

**Key Success Factors**:
1. **Disciplined execution**: Follow the plan, resist scope creep
2. **Team collaboration**: Daily standups, weekly reviews
3. **Quality over speed**: Don't skip testing or documentation
4. **Continuous monitoring**: Track metrics, adjust as needed
5. **Risk management**: Identify issues early, mitigate proactively

**Next Steps**:
1. Review and approve this plan
2. Assemble the team
3. Set up project tracking (Jira, Linear, GitHub Projects)
4. Schedule kickoff meeting
5. Begin Week 1 on agreed start date

---

**Version History**:
- v1.0 (2026-01-02): Initial plan created
