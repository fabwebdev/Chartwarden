# Secret Rotation Guide

**Last Updated**: December 28, 2025
**Phase**: 0 - Critical Security Fixes
**Ticket**: #002

## Overview

This document describes the secret management and rotation procedures for the Hospice EHR Backend system.

## Current Status

✅ **Completed** (December 28, 2025):
- All weak/default secrets rotated with cryptographically secure values
- Hardcoded secret fallbacks removed from source code
- Secret validation added to prevent application startup with missing secrets
- .env file confirmed NOT tracked in Git
- .env.example updated with secure placeholders and generation instructions

## Required Secrets

| Secret | Purpose | Length | Rotation Schedule |
|--------|---------|--------|-------------------|
| `JWT_SECRET` | JWT token signing | 128 chars (64 bytes hex) | Every 90 days or on compromise |
| `BETTER_AUTH_SECRET` | Better Auth session encryption | 128 chars (64 bytes hex) | Every 90 days or on compromise |
| `ADMIN_CREATION_SECRET` | Admin user creation authorization | 128 chars (64 bytes hex) | Every 90 days or on compromise |

## Secret Generation

### Using the Built-in Script

```bash
node scripts/generate-secrets.js
```

This will output secure, cryptographically random secrets suitable for production use.

### Manual Generation

If you need to generate secrets manually:

```bash
# Generate a single 64-byte (128 hex character) secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Secret Rotation Procedure

### 1. Pre-Rotation Checklist

- [ ] Schedule maintenance window (requires application restart)
- [ ] Notify users of planned downtime
- [ ] Backup current .env file
- [ ] Ensure all team members have access to new secrets

### 2. Generate New Secrets

```bash
# Generate new secrets
node scripts/generate-secrets.js > new-secrets.txt

# Review generated secrets
cat new-secrets.txt
```

### 3. Update Environment Variables

**Development/Staging:**
1. Update `.env` file with new secrets
2. Restart application: `npm run dev` or `npm start`

**Production:**
1. Update secrets in your secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)
2. Deploy updated secrets
3. Perform rolling restart of application instances

### 4. Invalidate Old Sessions

After rotating `JWT_SECRET` or `BETTER_AUTH_SECRET`:
- All existing user sessions will be invalidated
- Users will need to log in again
- This is expected behavior and improves security

### 5. Post-Rotation Verification

- [ ] Application starts successfully without errors
- [ ] Users can log in with new sessions
- [ ] JWT tokens are being generated correctly
- [ ] No authentication errors in logs

## Emergency Secret Rotation

If secrets are compromised (e.g., accidentally committed to Git, exposed in logs):

### Immediate Actions

1. **STOP** - Halt all non-essential operations
2. **ROTATE** - Generate and deploy new secrets immediately
3. **INVALIDATE** - Force logout all users
4. **AUDIT** - Review all recent access logs for suspicious activity
5. **NOTIFY** - Inform security team and affected users

### Git Secret Exposure Response

If secrets were committed to Git:

```bash
# 1. Generate new secrets immediately
node scripts/generate-secrets.js

# 2. Update .env file

# 3. Verify .env is in .gitignore
grep "^\.env$" .gitignore

# 4. Remove .env from Git history (if it was ever committed)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 5. Force push (coordinate with team)
git push origin --force --all

# 6. Notify all developers to delete and re-clone repository
```

## Security Best Practices

### ✅ DO

- Use the provided `scripts/generate-secrets.js` for secret generation
- Store production secrets in a secure vault (AWS Secrets Manager, Azure Key Vault)
- Rotate secrets every 90 days or immediately upon compromise
- Use different secrets for development, staging, and production
- Audit secret access regularly
- Include secret rotation in disaster recovery plans

### ❌ DON'T

- Never commit `.env` files to Git
- Never share secrets via email, Slack, or other insecure channels
- Never use weak or default secrets in production
- Never reuse secrets across environments
- Never hardcode secrets in source code
- Never log secret values

## Compliance Notes

**HIPAA Requirement**: §164.312(a)(2)(iv) - Encryption and Decryption
- Secrets must be cryptographically strong (minimum 64 bytes)
- Secrets must be rotated regularly
- Access to secrets must be audited and restricted

**Evidence for Audit**:
- Secret generation script: `scripts/generate-secrets.js`
- Secret validation: `src/config/config.js` and `src/config/betterAuth.js`
- Rotation logs: Documented in this file with dates

## Troubleshooting

### Error: "JWT_SECRET environment variable is required"

**Cause**: Application cannot start because JWT_SECRET is missing.

**Solution**:
```bash
# 1. Generate a new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Add to .env file
echo "JWT_SECRET=<generated-secret>" >> .env

# 3. Restart application
```

### Error: "BETTER_AUTH_SECRET environment variable is required"

**Cause**: Application cannot start because BETTER_AUTH_SECRET is missing.

**Solution**:
```bash
# 1. Generate a new secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 2. Add to .env file
echo "BETTER_AUTH_SECRET=<generated-secret>" >> .env

# 3. Restart application
```

## Audit Trail

| Date | Action | Performed By | Reason |
|------|--------|--------------|--------|
| 2025-12-28 | Initial secret rotation | System | Phase 0 Security Fix (TICKET #002) |
| | | | Removed weak default secrets |

## Next Rotation Due

Based on 90-day rotation schedule:

- **Next Rotation Date**: March 28, 2026
- **Reminder**: Set calendar reminder 2 weeks before rotation date

## Contact

For questions about secret management:
- Security Team: security@hospice.example.com
- DevOps Team: devops@hospice.example.com
- On-Call: Use PagerDuty for emergencies

---

**Document Version**: 1.0
**Last Review**: December 28, 2025
**Next Review**: March 28, 2026
