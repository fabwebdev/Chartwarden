# Validation Middleware Usage Guide

## Overview

The Yup-based validation middleware provides comprehensive request validation and sanitization for the Chartwarden API. It includes XSS protection, type validation, and pre-built schemas for common healthcare data types.

## Basic Usage

### 1. Import the middleware

```javascript
import { validate, validateBody, validateQuery, validateParams, fields, schemas } from '../middleware/validation.middleware.js';
```

### 2. Apply to routes

#### Simple body validation
```javascript
fastify.post('/patients', {
  preHandler: [authenticate, validateBody(schemas.patient.create)]
}, patientController.create);
```

#### Query parameter validation
```javascript
fastify.get('/patients', {
  preHandler: [authenticate, validateQuery(schemas.common.pagination)]
}, patientController.list);
```

#### URL parameter validation
```javascript
fastify.get('/patients/:id', {
  preHandler: [authenticate, validateParams(schemas.common.idParam)]
}, patientController.getById);
```

#### Combined validation (params + query + body)
```javascript
fastify.put('/patients/:id', {
  preHandler: [authenticate, validate({
    params: schemas.common.idParam,
    query: yup.object({ include: yup.string().oneOf(['medications', 'encounters']) }),
    body: schemas.patient.update
  })]
}, patientController.update);
```

## Pre-built Schemas

### Authentication
- `schemas.auth.signIn` - Email + password login
- `schemas.auth.signUp` - New user registration
- `schemas.auth.forgotPassword` - Password reset request
- `schemas.auth.resetPassword` - Password reset with token
- `schemas.auth.changePassword` - Change password for authenticated user

### Patient
- `schemas.patient.create` - Create new patient record
- `schemas.patient.update` - Update existing patient

### User Management
- `schemas.user.create` - Create new user account
- `schemas.user.update` - Update user account
- `schemas.user.updateProfile` - User profile update

### Encounters
- `schemas.encounter.create` - Create encounter/visit record
- `schemas.encounter.update` - Update encounter

### Medications
- `schemas.medication.create` - Create medication order
- `schemas.medication.update` - Update medication order

### Common Schemas
- `schemas.common.pagination` - Page, limit, sort, order
- `schemas.common.idParam` - UUID parameter validation
- `schemas.common.search` - Search query with pagination

## Field Validators

The `fields` object provides reusable validators for common field types:

```javascript
import { fields } from '../middleware/validation.middleware.js';

const mySchema = yup.object({
  email: fields.requiredEmail(),
  phone: fields.phone(),
  dateOfBirth: fields.requiredDate(),
  mrn: fields.mrn(),
  ssn: fields.ssn(),
  npi: fields.npi()
});
```

Available field validators:
- `uuid()` / `requiredUuid()` - UUID validation
- `email()` / `requiredEmail()` - Email with sanitization
- `phone()` - Phone number format
- `name()` / `requiredName()` - Name fields (1-100 chars)
- `password()` / `requiredPassword()` - Password (8-128 chars)
- `date()` / `requiredDate()` - ISO date strings
- `text()` - Long text (max 10,000 chars)
- `shortText()` - Short text (max 500 chars)
- `mrn()` - Medical Record Number
- `ssn()` - Social Security Number
- `npi()` - National Provider Identifier
- `positiveInt()` - Positive integers
- `boolean()` - Boolean values
- `oneOf(values, message)` - Enum validation

## Custom Schemas

### Using sanitizedString for XSS protection
```javascript
import { sanitizedString } from '../middleware/validation.middleware.js';

const commentSchema = yup.object({
  content: sanitizedString()
    .required('Content is required')
    .max(5000, 'Comment is too long')
});
```

### Building custom healthcare schemas
```javascript
const patientAdmissionSchema = yup.object({
  patientId: fields.requiredUuid(),
  admissionDate: fields.requiredDate(),
  admissionType: fields.oneOf(['routine', 'emergency', 'transfer']).required(),
  primaryDiagnosis: sanitizedString().required().max(500),
  admittingPhysician: fields.requiredUuid(),
  roomNumber: yup.string().matches(/^[A-Z0-9-]+$/, 'Invalid room number'),
  admissionNotes: fields.text()
});
```

## Error Handling

Validation errors automatically return a 422 Unprocessable Entity response with structured error details:

```json
{
  "success": false,
  "code": "VALIDATION_FAILED",
  "message": "The request contains invalid data",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address",
      "code": "VALIDATION_INVALID_EMAIL"
    },
    {
      "field": "dateOfBirth",
      "message": "Date is required",
      "code": "VALIDATION_REQUIRED_FIELD"
    }
  ]
}
```

## XSS Protection

All string inputs using `sanitizedString()` or field validators like `email()`, `name()`, etc. are automatically sanitized by escaping HTML entities:

```javascript
// Input: "<script>alert('XSS')</script>"
// Output: "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;/script&gt;"
```

## Validation Options

### stripUnknown (default: true)
Remove fields not defined in the schema:

```javascript
validate({
  body: mySchema,
  stripUnknown: true  // Unknown fields will be removed
})
```

### abortEarly (default: false)
Return all validation errors, not just the first one:

```javascript
validate({
  body: mySchema,
  abortEarly: false  // Returns all errors
})
```

## Testing

Test routes are available at `/api/validation-test/*` in development mode. See `validationTest.routes.js` for examples of all validation scenarios.

Example test endpoints:
- `POST /api/validation-test/body` - Test body validation
- `GET /api/validation-test/query` - Test query validation
- `GET /api/validation-test/params/:id` - Test param validation
- `POST /api/validation-test/sanitize` - Test XSS sanitization
- `POST /api/validation-test/patient` - Test patient schema
- `POST /api/validation-test/encounter` - Test encounter schema

## Best Practices

1. **Always use pre-built schemas** when available (auth, patient, user, etc.)
2. **Use `sanitizedString()`** for any user-provided text to prevent XSS
3. **Combine with authentication** - validation middleware should come after `authenticate` in preHandler array
4. **Validate at API boundaries** - don't rely solely on frontend validation
5. **Use specific field validators** (email, phone, uuid) instead of generic strings
6. **Healthcare data validation** - use MRN, SSN, NPI validators for compliance
7. **Return all errors** - keep `abortEarly: false` to help clients fix all issues at once

## Migration from Old Validation

The old validation middleware has been replaced. Update your routes:

**Before:**
```javascript
import validate from '../middleware/validation.middleware.js';

fastify.post('/endpoint', { preHandler: [validate] }, handler);
```

**After:**
```javascript
import { validateBody, schemas } from '../middleware/validation.middleware.js';

fastify.post('/endpoint', {
  preHandler: [validateBody(schemas.patient.create)]
}, handler);
```
