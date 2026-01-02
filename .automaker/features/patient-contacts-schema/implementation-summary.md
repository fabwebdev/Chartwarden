# Patient Contacts Schema Implementation Summary

## Feature: patient-contacts-schema

### Status: ✅ COMPLETE

All implementation files have been created and verified. The feature is ready for database migration and testing.

---

## Files Created

### 1. Database Schema
**File:** `services/api/src/db/schemas/patientContact.schema.js`

Comprehensive schema with:
- 8 contact types (EMERGENCY, FAMILY, CAREGIVER, HEALTHCARE_PROXY, LEGAL, FUNERAL_HOME, CLERGY, OTHER)
- Full name fields (first, last, middle, suffix, preferred name)
- Multiple phone numbers with type classification
- Complete address support
- Email and contact preferences
- Priority ordering and primary contact designation
- Authorization flags (PHI, care decisions)
- Legal document tracking (healthcare proxy, POA)
- Audit trail (created_by, updated_by, soft delete)
- Optimized indexes for common queries

### 2. Controller
**File:** `services/api/src/controllers/patient/PatientContacts.controller.js`

Full CRUD controller with:
- Comprehensive validation (phone types, contact types, US states, email format)
- Patient-scoped operations (GET, POST, PUT, DELETE)
- Convenience endpoint for emergency contacts
- Primary contact management (only one primary per type)
- Soft delete support
- Legacy methods for backwards compatibility

### 3. Routes
**File:** `services/api/src/routes/patient/PatientContacts.routes.js`

RESTful routes with:
- Patient-scoped endpoints (`/patients/:patientId/contacts`)
- Emergency contacts convenience endpoint
- Set-primary-contact action endpoint
- JSON Schema validation for all requests
- Authentication middleware on all routes
- Legacy routes for backwards compatibility
- Comprehensive Fastify schema documentation

### 4. Integration
**Modified:** `services/api/src/db/schemas/index.js`
- Added export for `patientContact.schema.js`

**Modified:** `services/api/src/routes/api.routes.js`
- Imported and registered patient contacts routes

---

## API Endpoints

### Patient-Scoped Endpoints (Recommended)

```
GET    /api/patients/:patientId/contacts
       Query params: ?type=EMERGENCY&active_only=true
       Returns: List of contacts for patient

GET    /api/patients/:patientId/emergency-contacts
       Returns: Active emergency contacts only

GET    /api/patients/:patientId/contacts/:id
       Returns: Specific contact details

POST   /api/patients/:patientId/contacts
       Body: Contact data (see schema)
       Returns: Created contact

PUT    /api/patients/:patientId/contacts/:id
       Body: Updated fields
       Returns: Updated contact

DELETE /api/patients/:patientId/contacts/:id
       Returns: Success message (soft delete)

POST   /api/patients/:patientId/contacts/:id/set-primary
       Returns: Updated contact marked as primary
```

### Legacy Endpoints (Backwards Compatible)

```
GET    /api/patient-contacts
POST   /api/patient-contacts/store
GET    /api/patient-contacts/:id
PUT    /api/patient-contacts/:id
DELETE /api/patient-contacts/:id
```

---

## Required Fields

When creating a contact:
- `first_name` (string, max 100 chars)
- `last_name` (string, max 100 chars)
- `relationship` (string, max 100 chars)
- `primary_phone` (string, max 20 chars)

---

## Optional Fields

### Name Information
- `middle_name`, `suffix`, `preferred_name`

### Contact Information
- `secondary_phone`, `secondary_phone_type`, `email`
- `address_line_1`, `address_line_2`, `city`, `state`, `zip_code`, `country`
- `preferred_contact_method`, `preferred_contact_time`, `preferred_language`

### Classification
- `contact_type` (defaults to 'EMERGENCY')
- `relationship_detail`, `priority`, `is_primary`, `is_active`

### Authorization
- `authorized_for_phi`, `authorized_for_decisions`
- `has_key_to_home`, `lives_with_patient`
- `healthcare_proxy_document`, `power_of_attorney`, `document_date`

### Notes
- `notes`, `special_instructions`

---

## Validation Rules

### Contact Types
EMERGENCY, FAMILY, CAREGIVER, HEALTHCARE_PROXY, LEGAL, FUNERAL_HOME, CLERGY, OTHER

### Phone Types
MOBILE, HOME, WORK

### Contact Methods
PHONE, EMAIL, TEXT

### US State Codes
All 50 states + DC, PR, VI, GU, AS, MP (2-letter codes)

### Email
Must contain '@' symbol

---

## Business Logic

### Primary Contact Management
- Only one contact can be marked as primary for each contact type
- When setting a contact as primary, all other contacts of the same type are automatically unmarked
- Use the `/set-primary` endpoint or set `is_primary: true` when creating/updating

### Soft Delete
- Contacts are soft deleted (marked with `deleted_at` timestamp)
- Deleted contacts are automatically marked as inactive
- Queries exclude soft-deleted contacts by default

### Priority Ordering
- Contacts are ordered by `priority` (lower = higher priority)
- Priority 1 = first contact to call
- Multiple contacts can have the same priority

---

## HIPAA Compliance Features

1. **PHI Authorization** - `authorized_for_phi` flag
2. **Care Decisions** - `authorized_for_decisions` flag
3. **Legal Documentation** - Healthcare proxy and POA tracking
4. **Audit Trail** - `created_by_id`, `updated_by_id`, timestamps
5. **Soft Delete** - Data retention without exposure
6. **Access Control** - All routes require authentication

---

## Database Migration

To apply the schema to your database:

```bash
# Ensure Docker and PostgreSQL are running
docker-compose up -d

# Run database sync
npm run sync

# Or use Drizzle migration
npm run migrate
npm run migrate:run
```

---

## Testing

### Manual API Testing

1. Start the API server:
   ```bash
   npm run dev:api
   ```

2. Authenticate and get a session cookie

3. Test endpoints:
   ```bash
   # List contacts
   curl http://localhost:3001/api/patients/1/contacts \
     -H "Cookie: session=YOUR_SESSION"

   # Create contact
   curl -X POST http://localhost:3001/api/patients/1/contacts \
     -H "Cookie: session=YOUR_SESSION" \
     -H "Content-Type: application/json" \
     -d '{
       "first_name": "John",
       "last_name": "Doe",
       "relationship": "Spouse",
       "primary_phone": "555-123-4567",
       "contact_type": "EMERGENCY"
     }'
   ```

### Integration Testing

Run the integration test suite:
```bash
npm run test:integration
```

---

## Edge Cases Handled

1. **International phone formats** - No format enforcement, supports +XX formats
2. **Incomplete addresses** - All address fields are optional
3. **Special characters in names** - Supports apostrophes, hyphens, etc.
4. **Multiple contacts** - Supports unlimited contacts per patient
5. **Long text fields** - `notes` and `special_instructions` use TEXT type
6. **Maximum lengths** - Proper varchar limits on all fields

---

## Next Steps for Developer

1. ✅ Schema implementation complete
2. ⏳ Run database migration: `npm run sync`
3. ⏳ Test API endpoints with Postman/curl
4. ⏳ Create frontend UI for contact management
5. ⏳ Add to patient detail page
6. ⏳ Implement contact validation in frontend
7. ⏳ Add contact search/filter functionality
8. ⏳ Consider adding contact merge functionality
9. ⏳ Add contact history/change tracking

---

## Verification

All implementation checks passed:

✅ Schema file created with all required fields
✅ Controller implements full CRUD operations
✅ Routes registered with authentication
✅ Schema exported in index
✅ Routes integrated into API
✅ Database indexes defined
✅ Foreign key constraints added
✅ Validation logic implemented
✅ Error handling in place
✅ JSON schema validation on routes
✅ All contact types supported
✅ HIPAA compliance features included
✅ Audit trail implemented
✅ Soft delete support added

---

## Support

For questions or issues:
1. Check API documentation: http://localhost:3001/documentation (when running)
2. Review controller validation logic in `PatientContacts.controller.js`
3. Test with legacy endpoints if patient-scoped endpoints have issues
4. Verify authentication middleware is working correctly
5. Check database connection and table creation

---

**Implementation Date:** 2026-01-02
**Feature Status:** Ready for database migration and testing
**Breaking Changes:** None (includes legacy routes for compatibility)
