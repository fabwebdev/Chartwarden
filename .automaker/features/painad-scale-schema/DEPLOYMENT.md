# PAINAD Scale Schema - Deployment Guide

## Feature Overview

The PAINAD (Pain Assessment in Advanced Dementia) scale is a behavioral pain assessment tool for dementia patients who cannot self-report pain. This implementation provides a comprehensive schema, RESTful API endpoints, and full CRUD operations with compliance features.

## Implementation Summary

### Files Created/Modified

#### Backend (services/api)
- **Schema**: `src/db/schemas/painadScale.schema.js` (NEW)
  - Comprehensive PAINAD scale with 5 behavioral indicators (0-2 each)
  - Dementia context fields (stage, type, verbal ability)
  - Intervention tracking (pharmacological & non-pharmacological)
  - Hospice-specific fields (caregiver involvement, comfort goals)
  - 21 CFR Part 11 compliance (signatures, amendments)
  - Indexes for common queries

- **Controller**: `src/controllers/PainadScale.controller.js` (NEW)
  - Full CRUD operations
  - Automatic score calculation (0-10)
  - Pain severity classification (NO_PAIN, MILD, MODERATE, SEVERE)
  - Patient statistics and trend analysis
  - Reference endpoint with scoring descriptions
  - Signature and amendment tracking

- **Routes**: `src/routes/painadScale.routes.js` (NEW)
  - RESTful endpoints with RBAC middleware
  - Patient-specific routes
  - Statistics and trend endpoints
  - Signature/amendment endpoints

- **Schema Export**: `src/db/schemas/index.js` (MODIFIED)
  - Added export for painadScale schema

- **Route Registration**: `src/routes/api.routes.js` (MODIFIED)
  - Registered painadScale routes

#### Shared Types (packages/types)
- **Types**: `src/models.ts` (MODIFIED)
  - PainadScale interface
  - All related type definitions (enums, constants)
  - Score descriptions and severity ranges

#### Tests (services/api)
- **Integration Test**: `tests/integration/painad-scale.test.js` (NEW)
  - Comprehensive test coverage
  - Schema validation tests
  - Score calculation tests
  - CRUD operations tests
  - Hospice-specific field tests
  - Signature and amendment tests

## Deployment Steps

### 1. Start Database Services

```bash
# From project root
docker-compose up -d postgres redis
```

### 2. Generate Database Migration

```bash
# From project root
npm run db:generate

# This will create a migration file in services/api/src/db/migrations/
# The migration will create the painad_scales table with all fields and indexes
```

### 3. Run Database Migration

```bash
# From project root
npm run db:migrate

# This will execute the migration and create the painad_scales table
```

### 4. Build TypeScript Types

```bash
# From project root
cd packages/types
npm run build
```

### 5. Verify Implementation

#### Run Integration Tests

```bash
# From services/api directory
npm run test:integration -- painad-scale.test.js
```

Expected results:
- All 18 tests should pass
- Tests verify schema validation, score calculation, CRUD operations, and compliance features

#### Manual API Testing

Start the API server:
```bash
# From project root
npm run dev:api
```

Test endpoints (requires authentication):
```bash
# Get reference information
curl http://localhost:3001/api/painad-scales/reference

# Create assessment (example)
curl -X POST http://localhost:3001/api/patients/1/painad-scales \
  -H "Content-Type: application/json" \
  -d '{
    "breathing_score": 1,
    "negative_vocalization_score": 0,
    "facial_expression_score": 1,
    "body_language_score": 0,
    "consolability_score": 1,
    "dementia_stage": "MODERATE",
    "assessment_type": "INITIAL"
  }'
```

### 6. Verify Syntax and Compilation

```bash
# JavaScript syntax check
cd services/api
node --check src/db/schemas/painadScale.schema.js
node --check src/controllers/PainadScale.controller.js
node --check src/routes/painadScale.routes.js

# TypeScript compilation check
cd ../../packages/types
npm run build
```

## API Endpoints

### Patient-Specific Assessments
- `GET /api/patients/:patientId/painad-scales` - List patient assessments
- `POST /api/patients/:patientId/painad-scales` - Create assessment
- `GET /api/patients/:patientId/painad-scales/stats` - Patient statistics
- `GET /api/patients/:patientId/painad-scales/trend` - Pain trend data

### Assessment Management
- `GET /api/painad-scales` - List all assessments (with filters)
- `GET /api/painad-scales/reference` - Scoring reference guide
- `GET /api/painad-scales/:id` - Get single assessment
- `PATCH /api/painad-scales/:id` - Update assessment
- `DELETE /api/painad-scales/:id` - Delete assessment

### Compliance
- `POST /api/painad-scales/:id/sign` - Sign assessment (21 CFR Part 11)
- `POST /api/painad-scales/:id/amend` - Amend signed assessment

## PAINAD Scoring Guide

### Component Scores (0-2 each)

#### 1. Breathing (independent of vocalization)
- **0**: Normal
- **1**: Occasional labored breathing, short hyperventilation
- **2**: Noisy labored breathing, long hyperventilation, Cheyne-Stokes

#### 2. Negative Vocalization
- **0**: None
- **1**: Occasional moan/groan, negative speech
- **2**: Repeated calling out, loud moaning/groaning, crying

#### 3. Facial Expression
- **0**: Smiling or inexpressive
- **1**: Sad, frightened, frown
- **2**: Facial grimacing

#### 4. Body Language
- **0**: Relaxed
- **1**: Tense, pacing, fidgeting
- **2**: Rigid, fists clenched, striking out

#### 5. Consolability
- **0**: No need to console
- **1**: Distracted/reassured by voice or touch
- **2**: Unable to console, distract, or reassure

### Total Score Interpretation
- **0**: No pain
- **1-3**: Mild pain
- **4-6**: Moderate pain
- **7-10**: Severe pain

## Database Schema

### Table: `painad_scales`

Key fields:
- Patient identification: `patient_id`, `encounter_id`, `note_id`
- Assessment context: `assessment_date`, `dementia_stage`, `dementia_type`, `verbal_ability`
- Component scores: `breathing_score`, `negative_vocalization_score`, etc. (0-2 each)
- Calculated fields: `total_score` (0-10), `pain_severity`, `pain_present`
- Intervention tracking: `intervention_provided`, `medication_administered`, `non_pharm_interventions`
- Hospice fields: `caregiver_present`, `comfort_goal_met`, `care_plan_update_needed`
- Compliance: `signed_at`, `signed_by_id`, `amended`, `amendment_reason`
- Audit: `created_by_id`, `updated_by_id`, `createdAt`, `updatedAt`

### Indexes
- `patient_id` (for patient queries)
- `assessment_date` (for chronological sorting)
- `total_score` (for severity filtering)
- `patient_id, assessment_date` (composite for patient timeline)
- `dementia_stage` (for dementia-specific reporting)
- `pain_severity` (for severity-based filtering)

## Validation Rules

1. **Component scores**: Must be 0, 1, or 2
2. **Total score**: Must equal sum of component scores (0-10)
3. **Pain severity**: Auto-calculated based on total score
4. **Pain present**: Auto-set to `true` if total score > 0
5. **Amendment**: Requires `amendment_reason` if assessment is signed
6. **Deletion**: Cannot delete signed assessments

## Compliance Features (21 CFR Part 11)

- **Electronic Signatures**: Track who signed and when
- **Amendment Tracking**: Full audit trail for signed assessments
- **Audit Fields**: Created/updated by and timestamps
- **No Deletion**: Signed assessments cannot be deleted
- **Amendment Reason**: Required for all amendments

## Integration Notes

### RBAC Permissions Required
- `VIEW_PATIENT` or `VIEW_CLINICAL_NOTES` - View assessments
- `CREATE_CLINICAL_NOTES` - Create assessments
- `UPDATE_CLINICAL_NOTES` - Update/sign/amend assessments
- `DELETE_CLINICAL_NOTES` - Delete unsigned assessments

### Related Schemas
- `patients` - Foreign key relationship
- `encounters` - Optional link to patient encounters
- `clinical_notes` - Optional link to clinical notes

## Troubleshooting

### Migration Issues
If migration fails:
1. Check PostgreSQL is running: `docker ps`
2. Check DATABASE_URL is set correctly
3. Run migration with verbose output: `npm run db:migrate -- --verbose`

### Test Failures
If integration tests fail:
1. Ensure test database is running
2. Check DATABASE_URL_TEST environment variable
3. Run migrations on test database
4. Check test setup in `tests/integration/setup.js`

### API Errors
If API endpoints return errors:
1. Verify routes are registered in `api.routes.js`
2. Check controller is exported correctly
3. Verify schema is exported in `db/schemas/index.js`
4. Check RBAC permissions are configured

## Reference

**Original Feature Request**: PAINAD Pain Assessment Scale Schema for Dementia Patients

**Clinical Reference**: Warden V, Hurley AC, Volicer L. (2003) Development and psychometric evaluation of the Pain Assessment in Advanced Dementia (PAINAD) scale. Journal of the American Medical Directors Association, 4(1), 9-15.

**Compliance Standards**:
- HIPAA - Audit logging and access controls
- 21 CFR Part 11 - Electronic signatures and amendments
- CMS Hospice Conditions of Participation - Pain assessment documentation
