---
name: Security Fix
about: Template for security vulnerability fixes
title: '[SECURITY] '
labels: security, needs-review
assignees: ''
---

## Security Issue

**Severity**: [ ] Critical | [ ] High | [ ] Medium | [ ] Low

**CVSS Score**: (if applicable)

**Affected Component**:
- File: `src/path/to/file.js`
- Line:
- Function/Method:

## Vulnerability Description

Describe the security vulnerability in detail:
- What is the issue?
- How can it be exploited?
- What is the potential impact?

## Current Vulnerable Code

```javascript
// Paste current vulnerable code here
```

## Proposed Fix

```javascript
// Paste proposed secure code here
```

## Impact Assessment

**Affected Users**: [ ] All | [ ] Admins | [ ] Specific roles: ___________

**Data at Risk**: [ ] PHI | [ ] Credentials | [ ] System integrity | [ ] Other: ___________

**Exploitability**: [ ] Easy | [ ] Medium | [ ] Difficult

## Steps to Reproduce

1.
2.
3.

## Acceptance Criteria

- [ ] Vulnerability fixed and verified
- [ ] Tests added/updated
- [ ] Penetration test passed
- [ ] Code review completed
- [ ] Documentation updated

## Related Issues

- Blocks: #
- Related to: #

## Security Checklist

- [ ] No sensitive data in logs
- [ ] No hardcoded credentials
- [ ] Input validation added
- [ ] Error handling doesn't leak info
- [ ] Authorization checks in place
- [ ] Audit logging added

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Manual verification complete
