# Patient API Service Documentation

This file provides comprehensive documentation for using the Patient API service in the frontend application.

## Overview

The `patient.ts` API service provides a centralized interface for all patient-related API endpoints. All functions use the `http` instance from `hooks/useCookie.ts` which handles authentication via cookies.

## Base Configuration

- **Base URL**: Automatically configured via `process.env.NEXT_PUBLIC_API_BASE_URL`
- **Authentication**: Cookie-based (handled automatically by the `http` instance)
- **All routes require authentication** (except `/api/patient/test`)

## Usage Examples

### Main Patient Routes

```typescript
import * as patientAPI from 'api/patient';

// Test patient routes
const testResult = await patientAPI.testPatientRoutes();

// Get all patients
const patients = await patientAPI.getAllPatients();

// Get patient by ID
const patient = await patientAPI.getPatientById(123);

// Create a new patient
const newPatient = await patientAPI.createPatient({
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-01-01',
  // ... other fields
});

// Update patient
const updatedPatient = await patientAPI.updatePatient(123, {
  preferred_name: 'Johnny',
  // ... other fields to update
});

// Delete patient (Admin only)
await patientAPI.deletePatient(123);
```

### Admission Information

```typescript
// Get all admissions
const admissions = await patientAPI.getAllAdmissions();

// Get admission by ID
const admission = await patientAPI.getAdmissionById(123);

// Auto-save admission information
await patientAPI.autoSaveAdmission({
  patient_id: 123,
  admission_date: '2024-01-01',
  // ... other fields
});
```

### Benefit Period

```typescript
// Create benefit period (available to any authenticated user)
await patientAPI.createBenefitPeriod(123);

// Update benefit period
await patientAPI.updateBenefitPeriod(456, {
  end_date: '2024-12-31',
});

// Get benefit period by ID
const period = await patientAPI.getBenefitPeriodById(456);
```

**Backend route details (from backend team):**

- `POST /api/benefit-periods/patient/:patientId/benefit-periods/create-next`
  - No request body required
  - Calculates next period automatically (period 1 & 2 = 90 days, afterwards 60 days)
  - Any authenticated user can call it; only `authenticate` middleware required
- `POST /api/benefit-periods/benefit-periods/:benefitPeriodId/nursing-clinical-notes`
  - Body example: `{ "note_date": "2025-11-25", "note": "Patient condition..." }`
- `GET /api/benefit-periods/patients/:id/chart`
  - Returns patient + benefit periods (property may be `benefitPeriods` or `benefit_periods`)

Example full URL:

```
POST http://localhost:3000/api/benefit-periods/patient/123/benefit-periods/create-next
```

### Assessments

```typescript
// Cardiac Assessment
const cardiacAssessments = await patientAPI.getAllCardiacAssessmentsForPatient(123);
const cardiacAssessment = await patientAPI.getCardiacAssessment(456);
await patientAPI.storeCardiacAssessment({
  patient_id: 123,
  assessment_date: '2024-01-01',
  notes: 'Assessment notes...',
});

// Endocrine Assessment
const endocrineAssessments = await patientAPI.getAllEndocrineAssessmentsForPatient(123);

// Hematological Assessment
const hematologicalAssessments = await patientAPI.getAllHematologicalAssessmentsForPatient(123);

// Integumentary Assessment
const integumentaryAssessments = await patientAPI.getAllIntegumentaryAssessmentsForPatient(123);
```

### Discharge

```typescript
// Get all discharges
const discharges = await patientAPI.getAllDischarges();

// Get discharge list
const dischargeList = await patientAPI.getDischargeList();

// Store discharge information
await patientAPI.storeDischarge({
  patient_id: 123,
  discharge_date: '2024-01-01',
  discharge_type: 'routine',
  discharge_location: 'Home',
});

// Get discharge by ID
const discharge = await patientAPI.getDischargeById(456);

// Get discharge sections
const sections = await patientAPI.getDischargeSections();
```

### DME Provider

```typescript
// Get all DME providers
const providers = await patientAPI.getAllDmeProviders();

// Create DME provider
const newProvider = await patientAPI.createDmeProvider({
  name: 'Provider Name',
  address: '123 Main St',
  phone: '555-1234',
});

// Update DME provider
await patientAPI.updateDmeProvider(123, {
  phone: '555-5678',
});

// Delete DME provider
await patientAPI.deleteDmeProvider(123);
```

### DNR Records

```typescript
// Get all DNR records
const dnrRecords = await patientAPI.getAllDnrRecords();

// Create DNR record
await patientAPI.createDnrRecord({
  patient_id: 123,
  dnr_date: '2024-01-01',
  status: 'active',
});

// Update DNR record
await patientAPI.updateDnrRecord(456, {
  status: 'inactive',
});

// Delete DNR record
await patientAPI.deleteDnrRecord(456);
```

### Pain Assessment

#### Get Pain Types

```typescript
// Get all pain type options
const breakthroughTypes = await patientAPI.getBreakthroughPainTypes();
const characterTypes = await patientAPI.getPainCharacterTypes();
const frequencyTypes = await patientAPI.getPainFrequencyTypes();
const observationTypes = await patientAPI.getPainObservationTypes();
// ... and many more pain type getters
```

#### Pain Assessment CRUD

```typescript
// Get all pain assessments
const assessments = await patientAPI.getAllPainAssessments();

// Get pain assessment by ID
const assessment = await patientAPI.getPainAssessmentById(123);

// Store pain assessment
const newAssessment = await patientAPI.storePainAssessment({
  patient_id: 123,
  assessment_date: '2024-01-01',
  pain_level: 7,
});
```

#### Pain Sub-Assessments

```typescript
// Store sub-assessments
await patientAPI.storePainRatedBy({
  pain_assessment_id: 123,
  rated_by_type_id: 1,
});

await patientAPI.storePainDuration({
  pain_assessment_id: 123,
  duration_type_id: 1,
});

// Get sub-assessments
const ratedBy = await patientAPI.getPainRatedBy(123);
const duration = await patientAPI.getPainDuration(123);
const frequency = await patientAPI.getPainFrequency(123);
// ... and many more
```

### Patient Pharmacy

```typescript
// Get all patient pharmacies
const pharmacies = await patientAPI.getAllPatientPharmacies();

// Create patient pharmacy
const newPharmacy = await patientAPI.createPatientPharmacy({
  name: 'Pharmacy Name',
  address: '123 Main St',
  phone: '555-1234',
});

// Update patient pharmacy
await patientAPI.updatePatientPharmacy(123, {
  phone: '555-5678',
});

// Delete patient pharmacy
await patientAPI.deletePatientPharmacy(123);
```

### Primary Diagnosis

```typescript
// Get all primary diagnoses
const diagnoses = await patientAPI.getAllPrimaryDiagnoses();

// Create primary diagnosis
const newDiagnosis = await patientAPI.createPrimaryDiagnosis({
  code: 'I10',
  description: 'Essential hypertension',
});

// Update primary diagnosis
await patientAPI.updatePrimaryDiagnosis(123, {
  description: 'Updated description',
});

// Delete primary diagnosis
await patientAPI.deletePrimaryDiagnosis(123);
```

### Select Options

```typescript
// Get dropdown options for forms
const raceEthnicityOptions = await patientAPI.getRaceEthnicityOptions();
const primaryDiagnosisOptions = await patientAPI.getPrimaryDiagnosisOptions();
const dmeProviderOptions = await patientAPI.getDmeProviderOptions();
const liaisonPrimaryOptions = await patientAPI.getLiaisonPrimaryOptions();
const liaisonSecondaryOptions = await patientAPI.getLiaisonSecondaryOptions();
const nutritionTemplate = await patientAPI.getNutritionTemplate();
const nutritionProblem = await patientAPI.getNutritionProblem();
```

### Vital Signs

```typescript
// Get all vital signs
const vitalSigns = await patientAPI.getAllVitalSigns();

// Store vital signs
await patientAPI.storeVitalSigns({
  patient_id: 123,
  measurement_date: '2024-01-01',
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  heart_rate: 72,
  respiratory_rate: 16,
  temperature: 98.6,
  oxygen_saturation: 98,
});

// Get vital signs by ID
const vitalSign = await patientAPI.getVitalSignsById(456);
```

## Error Handling

All API functions use the `http` instance which has interceptors configured for error handling:

- **401 Unauthorized**: Automatically redirects to `/login`
- **Other errors**: Returns rejected promise with error details

Example error handling:

```typescript
import * as patientAPI from 'api/patient';

try {
  const patient = await patientAPI.getPatientById(123);
  // Handle success
} catch (error) {
  console.error('Error fetching patient:', error);
  // Handle error (401 redirects automatically)
}
```

## TypeScript Types

Import types from `types/patient.ts`:

```typescript
import type {
  Patient,
  PatientListResponse,
  PatientResponse,
  CreatePatientRequest,
  UpdatePatientRequest,
  PainAssessment,
  VitalSigns,
  // ... other types
} from 'types/patient';
```

## Authorization Notes

Many routes have specific authorization requirements:

- **Admin only**: Delete operations typically require admin role
- **Role-based**: Some routes require specific roles (Admin, Doctor, Nurse, Patient)
- **Permission-based**: Some routes require specific permissions (e.g., `VIEW_PATIENT`, `UPDATE_PATIENT`)

The backend will enforce these restrictions and return 401/403 errors if authorization fails.

## Migration Guide

If you're migrating existing code to use this centralized API:

### Before (Direct API calls):
```typescript
import http from 'hooks/useCookie';

const fetchPatient = async (id: number) => {
  const response = await http.get(`/patient/${id}`);
  return response.data;
};
```

### After (Using centralized API):
```typescript
import * as patientAPI from 'api/patient';

const fetchPatient = async (id: number) => {
  return await patientAPI.getPatientById(id);
};
```

Benefits:
- ✅ Centralized API logic
- ✅ Consistent error handling
- ✅ TypeScript type safety
- ✅ Easier to maintain and update
- ✅ Better code organization

## API Endpoints Reference

For a complete list of all available backend endpoints, see `HOSPICE_ROUTES_COUNT.md` in the project root.

