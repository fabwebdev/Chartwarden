# Secure Error Handling Guide

**Implemented**: December 28, 2025
**Phase**: 0 - Critical Security Fixes
**Ticket**: #005
**CVSS Score**: 6.5 (Medium - Information Disclosure)

## Overview

Secure error handling has been implemented to prevent leakage of:
- **PHI/PII** (Protected Health Information / Personally Identifiable Information)
- **Database schema details** (table names, column names, SQL queries)
- **Stack traces** (file paths, line numbers, internal logic)
- **System information** (versions, configurations)

## Security Improvements

### ✅ Before (INSECURE)

```json
{
  "status": 500,
  "message": "relation \"patients\" does not exist",
  "detail": "SELECT * FROM patients WHERE ssn = '123-45-6789' failed",
  "hint": "Perhaps you meant to reference table \"patient\"",
  "stack": "Error: relation does not exist\n    at /app/src/controllers/Patient.js:45:12\n    ..."
}
```

**Problems:**
- ❌ Exposes database table name
- ❌ Reveals SSN in error message (PHI leak!)
- ❌ Shows database hints (reveals schema)
- ❌ Stack trace exposes file structure

### ✅ After (SECURE)

**Production:**
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "An error occurred",
  "errorId": "ERR-1735398765000-A3F2B1C4"
}
```

**Development:**
```json
{
  "status": 500,
  "error": "Error",
  "message": "A database error occurred. Please contact support.",
  "errorId": "ERR-1735398765000-A3F2B1C4",
  "stack": "Error: ...\n    at /app/src/controllers/Patient.js:45:12"
}
```

**Server Logs (PII Redacted):**
```json
{
  "errorId": "ERR-1735398765000-A3F2B1C4",
  "timestamp": "2025-12-28T10:30:00.000Z",
  "name": "DatabaseError",
  "message": "A database error occurred. Please contact support.",
  "code": "42P01",
  "status": 500,
  "path": "/api/patients",
  "method": "GET",
  "ip": "XXX.XXX.XXX.XXX",
  "userId": "user123"
}
```

## PII Redaction Patterns

The system automatically redacts:

| Type | Pattern | Redacted To |
|------|---------|-------------|
| SSN | 123-45-6789 | XXX-XX-XXXX |
| Phone | (123) 456-7890 | (XXX) XXX-XXXX |
| Email | patient@example.com | [REDACTED_EMAIL] |
| Names | John Smith | [REDACTED_NAME] |
| MRN | MRN-123456 | MRN-XXXXXX |
| Credit Card | 1234-5678-9012-3456 | XXXX-XXXX-XXXX-XXXX |
| DOB | 01/15/1980 | XX/XX/XXXX |
| Passwords | password: secret123 | password: [REDACTED] |
| Tokens | token: abc123... | token: [REDACTED] |
| Database URLs | postgresql://user:pass@host | postgresql://[REDACTED] |

## Error Response Structure

### Production Mode

**Generic Errors:**
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "An error occurred",
  "errorId": "ERR-1735398765000-A3F2B1C4"
}
```

**Validation Errors:**
```json
{
  "status": 422,
  "error": "Validation Error",
  "message": "The request contains invalid data",
  "errorId": "ERR-1735398765000-B5D3E2F6",
  "errors": [
    {
      "type": "field",
      "msg": "First name is required",
      "path": "firstName",
      "location": "body"
    }
  ]
}
```

**Note:** Validation errors show field names and constraints, but NEVER the actual invalid values (which could contain PHI).

### Development Mode

**Detailed Errors:**
```json
{
  "status": 500,
  "error": "DatabaseError",
  "message": "A database error occurred. Please contact support.",
  "errorId": "ERR-1735398765000-C7E4F3G8",
  "code": "23505",
  "detail": "Duplicate key violates unique constraint",
  "stack": "Error: ...\n    at /app/src/..."
}
```

## Error Tracking IDs

Every error generates a unique tracking ID in format:
```
ERR-{timestamp}-{random-hex}
Example: ERR-1735398765000-A3F2B1C4
```

**Benefits:**
- Users can reference the ID when contacting support
- Developers can grep logs for specific errors
- No PHI needed to track down issues

**Usage:**
```bash
# Search logs for specific error
grep "ERR-1735398765000-A3F2B1C4" logs/app.log
```

## Implementation

### Custom Error Classes

```javascript
// Create custom error with status code
class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

// Throw in controller
if (!patient) {
  throw new NotFoundError('Patient not found');
}
```

### Validation Errors

```javascript
// Validation errors automatically sanitized
const errors = [
  {
    type: 'field',
    msg: 'Invalid email format',
    path: 'email',
    location: 'body',
    value: 'patient@example.com' // ❌ This will be removed
  }
];

throw {
  status: 422,
  errors: errors
};

// Response to client (value removed):
{
  "status": 422,
  "error": "Validation Error",
  "message": "The request contains invalid data",
  "errors": [
    {
      "type": "field",
      "msg": "Invalid email format",
      "path": "email",
      "location": "body"
      // ✅ No "value" field
    }
  ]
}
```

### Database Errors

```javascript
// Database errors automatically sanitized
try {
  await db.query('SELECT * FROM patients WHERE id = $1', [patientId]);
} catch (error) {
  // Error might be: "relation patients does not exist"
  // Client receives: "A database error occurred. Please contact support."
  // Server logs: Full error with PII redacted
  throw error;
}
```

## Testing

### Test PII Redaction

```javascript
import { redactPII, containsPII } from '../utils/piiRedactor.js';

// Test SSN redaction
const text = 'Patient SSN is 123-45-6789';
const redacted = redactPII(text);
console.log(redacted); // "Patient SSN is XXX-XX-XXXX"

// Test PII detection
const hasPII = containsPII('Email: patient@example.com');
console.log(hasPII); // true
```

### Test Error Responses

```bash
# Development mode - shows details
NODE_ENV=development npm start

# Production mode - generic messages
NODE_ENV=production npm start

# Test endpoint
curl http://localhost:3000/api/nonexistent
# Production: {"status":404,"error":"Resource Not Found","message":"The requested resource was not found","errorId":"ERR-..."}
# Development: Same + stack trace
```

## Best Practices

### ✅ DO

- Always throw errors with appropriate status codes
- Use custom error classes for different error types
- Let the error handler sanitize messages automatically
- Include context when throwing errors (but not PHI)
- Use error tracking IDs when investigating issues

```javascript
// Good
if (!patient) {
  throw new NotFoundError(`Patient not found`);
  // Handler will add errorId automatically
}

// Good - provide context without PHI
try {
  await processPayment(amount);
} catch (error) {
  error.context = { operation: 'payment', amount };
  throw error;
}
```

### ❌ DON'T

- Don't include PHI in error messages
- Don't expose database schema details
- Don't send stack traces to client in production
- Don't log unredacted errors
- Don't disable error sanitization

```javascript
// Bad - includes PHI
throw new Error(`Failed to process payment for patient ${patient.ssn}`);

// Bad - exposes schema
throw new Error(`Column "social_security_number" does not exist`);

// Bad - too much detail
throw new Error(`Database connection failed at 192.168.1.100:5432 with user "admin"`);
```

## Monitoring & Logging

### Production Logging

Errors are logged server-side with PII redaction:

```javascript
// In production, integrate with logging service
if (process.env.NODE_ENV === 'production') {
  // Send to Sentry, Loggly, etc.
  Sentry.captureException(error, {
    extra: redactedDetails
  });
}
```

### Log Search

```bash
# Find all errors for a specific user (by errorId)
grep "ERR-1735398765000" logs/app.log

# Find database errors
grep "DatabaseError" logs/app.log

# Find errors on specific endpoint
grep "path.*\/api\/patients" logs/app.log
```

## Compliance

### HIPAA §164.514(b) - De-identification

✅ **Compliant**: All PHI is redacted from error messages before sending to client or logging

**Evidence:**
- `src/utils/piiRedactor.js` - PII redaction implementation
- `src/exceptions/Handler.js:109-112` - Redaction applied to logs
- `src/exceptions/Handler.js:133` - Redaction applied to error messages

### OWASP A04:2021 - Insecure Design

✅ **Mitigated**: Error messages do not leak system information

**Evidence:**
- `src/exceptions/Handler.js:211-248` - Production response builder
- `src/exceptions/Handler.js:136-154` - Database error sanitization
- Generic error messages prevent information disclosure

## Troubleshooting

### "An error occurred" - Generic Message

**Cause:** Production mode returning generic errors (by design)

**Solution:**
1. Check server logs for full error details
2. Use errorId to find specific error in logs
3. Switch to development mode to see detailed errors locally

### Error ID Not Found in Logs

**Cause:** Logs may have been rotated or not persisted

**Solution:**
1. Ensure logging is configured properly
2. Check log retention settings
3. Consider using external logging service (Sentry, Loggly)

### PII Still Appearing in Logs

**Cause:** New PII pattern not covered by redactor

**Solution:**
1. Add pattern to `src/utils/piiRedactor.js`
2. Test with sample data
3. Update redaction patterns

---

**Last Updated**: December 28, 2025
**Next Review**: March 28, 2026
