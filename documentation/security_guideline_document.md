# Chartwarden Security Guidelines

This document outlines the mandatory security principles, controls, and best practices tailored for the Chartwarden monorepo—a comprehensive hospice EHR system. By embedding these guidelines throughout design, development, testing, and deployment, we ensure HIPAA compliance, protect patient data, and maintain a resilient, trustworthy platform.

---

## 1. Security by Design

- **Embed Security from Day One**: Integrate threat modeling, secure design reviews, and risk assessments early in each feature. Treat security as a first-class requirement, not an afterthought.
- **Modular & Layered Architecture**: Maintain clear separation between frontend (`apps/web`), backend (`services/api`), and shared packages (`packages/*`). Each layer must implement its own controls (e.g., input validation at API edge, output encoding in UI).
- **CI/CD Gatekeepers**: Enforce linters (ESLint), formatters (Prettier), type safety (TypeScript), and security scanners (SAST/DAST) in GitHub Actions before merging or deploying.
- **Principle of Least Privilege**: Grant services and users only the minimal permissions needed. E.g., database roles limited to specific schemas; Redis only accessible by backend.

---

## 2. Authentication & Access Control

- **Strong Authentication**:
  - Use **Better Auth** or equivalent to issue JWTs, signed with strong keys. Reject `alg: none` tokens. Enforce `exp`, `iat`, `nbf` on all tokens.
  - Store passwords using Argon2 or bcrypt with unique salts. Enforce complexity (≥12 characters, mixed case, symbols).
  - Implement **Multi-Factor Authentication (MFA)** for users with elevated privileges (admins, clinicians).
- **Secure Session Management**:
  - If using cookie-based sessions, set `HttpOnly`, `Secure`, `SameSite=Strict`, and enforce idle/absolute timeouts.
  - Protect against session fixation by regenerating session IDs on login.
- **Role-Based & Attribute-Based Access Control (RBAC/ABAC)**:
  - Define granular permissions in `PERMISSIONS` configuration. Enforce via `permission.middleware.js` and CASL on the frontend.
  - Dynamically evaluate attribute-based policies for sensitive resources (e.g., only assigned care team can view PHI).
- **Server-Side Authorization Checks**: Every controller must invoke permission middleware before accessing or mutating data.

---

## 3. Input Handling & Output Encoding

- **Schema-Driven Validation**:
  - Leverage Fastify JSON Schema or libraries like Zod/Yup to validate all request bodies, path parameters, and query strings in `routes/*`.
  - Never trust client-side validation alone; replicate critical checks on the server.
- **Prevent Injection Attacks**:
  - Use **Drizzle ORM** with parameterized queries to eliminate SQL injection risk.
  - Sanitize any dynamic queries in EDI parsing and PDF/Excel generation.
- **Cross-Site Scripting (XSS) Mitigation**:
  - Encode all user-supplied data in React components with MUI using libraries like DOMPurify for any HTML inputs.
  - Enforce a strict Content Security Policy (CSP) to disallow inline scripts and only permit trusted script sources.
- **Safe Redirects & Forwards**: Validate redirect targets against an allowlist of internal URLs to prevent open redirects.
- **Secure File Uploads**:
  - Validate MIME types, file extensions, and maximum sizes.
  - Store uploads in a non-web-servable location or isolate in a dedicated bucket with restricted access.
  - Scan for malware before processing.

---

## 4. Data Protection & Privacy

- **Encryption in Transit**:
  - Enforce HTTPS (TLS 1.2+) with HSTS headers. Disable weak ciphers (SSLv3, TLS 1.0/1.1).
- **Encryption at Rest**:
  - Encrypt PostgreSQL data files and Redis persistence using AES-256.
  - Use a centralized Key Management Service (KMS) (e.g., AWS KMS, HashiCorp Vault) to manage encryption keys.
- **PII/PHI Redaction**:
  - Integrate Pino log redaction to strip sensitive fields (SSN, PHI) before writing logs.
  - Ensure error responses and API payloads never expose internal IDs or stack traces.
- **Secure Secrets Management**:
  - Move environment-sensitive values (DB credentials, JWT signing keys) to a secrets manager. Avoid hardcoding in `.env` or code.
- **Data Retention & Disposal**:
  - Implement automated data archival and secure deletion policies in compliance with HIPAA and organization retention schedules.

---

## 5. API & Service Security

- **Rate Limiting & Throttling**:
  - Use Fastify rate-limit plugin or Redis-backed throttle to prevent brute-force and DoS attacks on sensitive endpoints (e.g., login, EDI ingestion).
- **Restrictive CORS**:
  - Configure CORS to allow only trusted origins (the Chartwarden web client domains) and specific methods.
- **CSRF Protection**:
  - For cookie-based authentication, implement synchronizer tokens for all state-changing requests.
- **Minimal Data Exposure**:
  - Return only necessary fields in API responses. Avoid sending full database records if only a subset is needed.
- **API Versioning**:
  - Prefix routes (e.g., `/api/v1/...`) to manage breaking changes gracefully and securely.

---

## 6. Web Application Security Hygiene

- **Security HTTP Headers**:
  - `Content-Security-Policy`: Restrict script, style, and frame sources.
  - `Strict-Transport-Security`: Enforce HTTPS for at least one year.
  - `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`.
- **Secure Cookie Attributes**:
  - Set `HttpOnly`, `Secure`, `SameSite` on all auth cookies.
- **Avoid Client-Side Storage of PHI**: Do not store PII in `localStorage` or `sessionStorage`. Use in-memory or state management libraries (Zustand).
- **Subresource Integrity (SRI)**: When loading third-party scripts/styles, include SRI hashes to verify integrity.

---

## 7. Infrastructure & Configuration Management

- **Hardened Containers & Servers**:
  - Base images must be minimal and regularly patched. Disable unnecessary services.
- **Network Segmentation**:
  - Place the database and Redis in private subnets. Only the API service can connect to them.
- **Firewall & Port Management**:
  - Expose only required ports (443 for the web/API). Disable SSH or restrict it to a bastion host.
- **Configuration as Code**:
  - Store Kubernetes manifests or Docker Compose files in Git. Enforce secure defaults (read-only volumes, non-root containers).
- **Secrets in CI/CD**:
  - Use GitHub Actions Secrets or a vault integration. Rotate secrets on a scheduled basis.
- **Disable Debug in Production**:
  - Ensure `NODE_ENV=production` and remove any fastify debug plugins or verbose logging.

---

## 8. Dependency Management

- **Lockfiles & Deterministic Builds**:
  - Commit `package-lock.json` / `yarn.lock` and update dependencies via controlled pull requests.
- **Vulnerability Scanning**:
  - Integrate SCA tools (e.g., Dependabot, Snyk) to scan all direct and transitive dependencies for CVEs.
- **Minimal Footprint**:
  - Remove unused packages. Vet third-party libraries for maintenance activity and security posture.
- **Regular Upgrades**:
  - Schedule quarterly dependency reviews and patch upgrades. Test thoroughly in staging before prod rollout.

---

## 9. DevOps & CI/CD Security

- **Least Privilege in Pipelines**:
  - Grant GitHub Actions only the minimal scopes needed. Use OIDC for ephemeral credentials to cloud resources.
- **SAST & DAST Integration**:
  - Run static code analyzers (ESLint security plugins, custom rules) and dynamic scans (e.g., OWASP ZAP) on every PR.
- **Approval Gates**:
  - Require at least two reviewers and a passing security scan before merging.
- **Immutable Artifacts**:
  - Build Docker images with reproducible tags and push to a trusted registry. Disallow inline image pulls from external sources.

---

## 10. Monitoring, Auditing & Incident Response

- **Comprehensive Audit Logging**:
  - Capture critical events (login attempts, permission changes, data exports) with timestamp, user ID, and context.
- **Log Aggregation & Alerting**:
  - Ship logs to a centralized SIEM (e.g., ELK, Splunk). Configure alerts for suspicious patterns (excessive 401s, rate-limit triggers).
- **Periodic Security Reviews**:
  - Conduct quarterly penetration tests and compliance audits (HIPAA readiness).
- **Incident Response Plan**:
  - Define roles, communication channels, and recovery procedures. Test tabletop exercises biannually.

---

By adhering to these guidelines, the Chartwarden platform will maintain a robust security posture, safeguard sensitive patient data, and comply with relevant healthcare regulations. Security is a continuous effort—regularly review, update, and audit your controls to stay ahead of emerging threats.
