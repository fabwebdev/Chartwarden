# QAPI Module - Testing Guide

## Module Validation Results ✅

All code validation passed:
- ✅ Schema syntax valid (`src/db/schemas/qapi.schema.js`)
- ✅ Controller syntax valid (`src/controllers/QAPI.controller.js`)
- ✅ Routes syntax valid (`src/routes/qapi.routes.js`)
- ✅ Routes registered in API router
- ✅ Schema exported in index.js

## Module Statistics

- **Database Tables**: 7
- **Controller Methods**: 24
- **API Routes**: 24
- **Lines of Code**: ~1,700 total

## Database Tables Created

1. `incidents` - Adverse event tracking with severity levels, root cause analysis
2. `grievances` - Patient/family complaint management with resolution tracking
3. `quality_measures` - Performance metric definitions with benchmarks
4. `quality_measure_data` - Actual measurement data points with trend analysis
5. `performance_improvement_projects` - Structured PIPs with PDSA cycles
6. `chart_audits` - Documentation quality reviews with compliance scoring
7. `infection_control` - Infection prevention and HAI surveillance

## API Endpoints (24 routes)

### Incidents Management (6 endpoints)
```
GET    /api/incidents              - List all incidents with filters
GET    /api/incidents/:id          - Get incident by ID
POST   /api/incidents              - Create new incident
PUT    /api/incidents/:id          - Update incident
POST   /api/incidents/:id/close    - Close incident with resolution
DELETE /api/incidents/:id          - Delete incident (soft delete)
```

### Grievances Management (6 endpoints)
```
GET    /api/grievances             - List all grievances with filters
GET    /api/grievances/:id         - Get grievance by ID
POST   /api/grievances             - Create new grievance
PUT    /api/grievances/:id         - Update grievance
POST   /api/grievances/:id/resolve - Resolve grievance
DELETE /api/grievances/:id         - Delete grievance (soft delete)
```

### Quality Measures (4 endpoints)
```
GET    /api/quality-measures       - List all quality measures
POST   /api/quality-measures       - Create quality measure
POST   /api/quality-measures/data  - Record measure data point
GET    /api/quality-measures/trends - Get measure trends over time
```

### Performance Improvement Projects (3 endpoints)
```
GET    /api/pips                   - List all PIPs
POST   /api/pips                   - Create new PIP
PUT    /api/pips/:id               - Update PIP status/progress
```

### Chart Audits (2 endpoints)
```
POST   /api/chart-audits           - Conduct chart audit
GET    /api/chart-audits           - Get audit results with filters
```

### Infection Control (3 endpoints)
```
GET    /api/infections             - List all infection reports
POST   /api/infections             - Report new infection
PUT    /api/infections/:id         - Update infection report
```

## Testing Prerequisites

⚠️ **Database Authentication Issue**: The server cannot start due to PostgreSQL authentication failure.

**Error**: `password authentication failed for user "hospici"`

**Required Fix**: Update the `.env` file with correct database credentials:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Manual Testing Steps

### 1. Fix Database Credentials
Update `.env` file with valid PostgreSQL credentials.

### 2. Start the Server
```bash
npm start
```

### 3. Test Authentication
```bash
# Get authentication token first
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

### 4. Test Incident Creation
```bash
curl -X POST http://localhost:8000/api/incidents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "patient_id": 1,
    "incident_date": "2024-12-27",
    "incident_type": "MEDICATION_ERROR",
    "severity": "MODERATE",
    "description": "Patient received incorrect dose of medication",
    "location": "Patient home",
    "status": "OPEN"
  }'
```

### 5. Test Incident Listing with Filters
```bash
# Get all incidents
curl http://localhost:8000/api/incidents \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Filter by severity
curl "http://localhost:8000/api/incidents?severity=HIGH" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Filter by date range
curl "http://localhost:8000/api/incidents?from_date=2024-01-01&to_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 6. Test Grievance Creation
```bash
curl -X POST http://localhost:8000/api/grievances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "patient_id": 1,
    "grievance_type": "CARE_QUALITY",
    "priority": "HIGH",
    "description": "Family concerned about delayed response time",
    "received_date": "2024-12-27",
    "complainant_name": "John Doe",
    "complainant_relationship": "Son",
    "status": "UNDER_INVESTIGATION"
  }'
```

### 7. Test Quality Measure Creation
```bash
# Create quality measure definition
curl -X POST http://localhost:8000/api/quality-measures \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "measure_name": "Pain Management - 24hr Assessment",
    "category": "PAIN_MANAGEMENT",
    "description": "Percentage of patients with pain assessment within 24 hours",
    "target_value": 95.0,
    "cms_required": true,
    "measurement_frequency": "MONTHLY",
    "status": "ACTIVE"
  }'

# Record data point for the measure
curl -X POST http://localhost:8000/api/quality-measures/data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "quality_measure_id": 1,
    "measurement_date": "2024-12-27",
    "actual_value": 97.5,
    "target_value": 95.0,
    "numerator": 39,
    "denominator": 40,
    "data_source": "EHR Chart Review"
  }'
```

### 8. Test PIP Creation
```bash
curl -X POST http://localhost:8000/api/pips \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "project_name": "Improve Pain Assessment Timeliness",
    "problem_statement": "15% of patients not receiving pain assessment within required 24-hour window",
    "aim_statement": "Increase pain assessment compliance to 95% within 90 days",
    "priority": "HIGH",
    "start_date": "2024-12-27",
    "target_completion_date": "2025-03-27",
    "status": "PLANNING"
  }'
```

### 9. Test Chart Audit
```bash
curl -X POST http://localhost:8000/api/chart-audits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "patient_id": 1,
    "audit_date": "2024-12-27",
    "auditor_id": "user-123",
    "audit_type": "COMPREHENSIVE",
    "documentation_complete": true,
    "signatures_present": true,
    "orders_current": true,
    "compliance_score": 95,
    "findings": "All required documentation present. Minor formatting issues noted.",
    "recommendations": "Update nursing note templates for consistency"
  }'
```

### 10. Test Infection Reporting
```bash
curl -X POST http://localhost:8000/api/infections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "patient_id": 1,
    "infection_type": "UTI",
    "source": "HEALTHCARE_ASSOCIATED",
    "onset_date": "2024-12-27",
    "symptoms": "Fever, dysuria, cloudy urine",
    "culture_results": "E. coli - >100,000 CFU/mL",
    "intervention_taken": "Antibiotic therapy initiated per physician order",
    "reported_to_physician": true,
    "reported_to_health_dept": false
  }'
```

## Testing Checklist

- [ ] Fix database credentials in `.env` file
- [ ] Start server successfully
- [ ] Obtain authentication token
- [ ] Test all 6 incident endpoints
- [ ] Test all 6 grievance endpoints
- [ ] Test all 4 quality measure endpoints
- [ ] Test all 3 PIP endpoints
- [ ] Test all 2 chart audit endpoints
- [ ] Test all 3 infection control endpoints
- [ ] Verify RBAC permissions are enforced
- [ ] Verify audit logging is working
- [ ] Verify soft delete functionality
- [ ] Test filtering on all list endpoints
- [ ] Verify data validation
- [ ] Test error handling (400, 401, 403, 404 responses)

## Expected Behaviors

### Filtering
All list endpoints support filtering:
- **Incidents**: `patient_id`, `incident_type`, `severity`, `status`, `from_date`, `to_date`
- **Grievances**: `patient_id`, `grievance_type`, `priority`, `status`, `from_date`, `to_date`
- **Quality Measures**: `category`, `status`, `cms_required`
- **PIPs**: `status`, `priority`
- **Chart Audits**: `patient_id`, `auditor_id`, `from_date`, `to_date`
- **Infections**: `patient_id`, `infection_type`, `source`, `from_date`, `to_date`

### Auto-Calculations
- **Quality Measure Data**: Variance automatically calculated as `actual_value - target_value`

### Soft Delete
All entities support soft delete via `deleted_at` timestamp. Deleted records are filtered from queries.

### Audit Trail
All entities track:
- `created_by_id` - User who created the record
- `updated_by_id` - User who last updated the record
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## Known Issues

1. **Database Authentication**: Server cannot start until database credentials are corrected in `.env` file
2. **No Migration Run**: Database tables have not been created yet (need to run migrations after fixing database connection)

## Next Steps

1. Fix database credentials
2. Run database migrations: `npm run migrate:run`
3. Start server: `npm start`
4. Run manual tests using curl or Postman
5. Verify all 24 endpoints work correctly
6. Test RBAC permissions
7. Verify data persistence
8. Generate comprehensive API documentation (optional)

## File Locations

- **Schema**: `/src/db/schemas/qapi.schema.js`
- **Controller**: `/src/controllers/QAPI.controller.js`
- **Routes**: `/src/routes/qapi.routes.js`
- **API Registration**: `/src/routes/api.routes.js` (lines 29, 126)

---

**Module Status**: ✅ Code complete and validated, waiting for database configuration to run live tests
