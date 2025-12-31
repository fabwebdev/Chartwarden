# Hospice EHR API Documentation
## Clinical Modules: HOPE Assessments, Encounters, Care Planning & IDG Meetings

**Version:** 1.0.0
**Last Updated:** 2024-12-27
**Base URL:** `http://localhost:3000/api`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [HOPE Assessments API](#hope-assessments-api) (13 endpoints)
4. [Encounters API](#encounters-api) (12 endpoints)
5. [Care Planning API](#care-planning-api) (12 endpoints)
6. [IDG Meetings API](#idg-meetings-api) (15 endpoints)
7. [Data Models](#data-models)
8. [Error Responses](#error-responses)
9. [Code Examples](#code-examples)

---

## Overview

This document covers **52 API endpoints** across four critical clinical modules:

| Module | Endpoints | Priority | Compliance Requirement |
|--------|-----------|----------|------------------------|
| HOPE Assessments | 13 | **HIGH** | CMS - 4% payment reduction if non-compliant |
| Encounters | 12 | **HIGH** | Required for billing |
| Care Planning | 12 | **HIGH** | Medicare requirement for all patients |
| IDG Meetings | 15 | **HIGH** | 14-day review rule |

### Key Features

- **21 CFR Part 11 Compliant Electronic Signatures** - SHA-256 hashing, IP tracking, audit trails
- **CMS HOPE Compliance** - Admission, HUV1, HUV2, Discharge, and SFV assessments
- **SOAP Note Documentation** - Subjective, Objective, Assessment, Plan
- **Interdisciplinary Care Planning** - Problems, Goals, Interventions with versioning
- **IDG 14-Day Compliance** - Patient review tracking and overdue alerts
- **RBAC Security** - Role-based access control on all endpoints
- **Audit Logging** - Complete user action tracking

---

## Authentication

All endpoints require Bearer token authentication.

### Headers

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Permissions Required

Different endpoints require different permission levels:

- **VIEW_PATIENT** - View patient data
- **VIEW_CLINICAL_NOTES** - View clinical documentation
- **CREATE_CLINICAL_NOTES** - Create assessments, encounters, care plans
- **UPDATE_CLINICAL_NOTES** - Update and sign documentation
- **DELETE_CLINICAL_NOTES** - Delete unsigned documentation
- **VIEW_REPORTS** - View compliance and analytics reports

---

## HOPE Assessments API

Hospice Outcomes & Patient Evaluation (HOPE) - CMS requirement. Non-compliance can result in **4% Medicare payment reduction**.

### Assessment Types

| Type | Timeframe | Description |
|------|-----------|-------------|
| **ADMISSION** | Within 5 days of admission | Initial comprehensive assessment |
| **HUV1** | Days 6-15 after admission | First hospice update visit |
| **HUV2** | Days 16-30 after admission | Second hospice update visit |
| **DISCHARGE** | At discharge | Discharge assessment |
| **SYMPTOM_FOLLOWUP** | Within 48 hours of moderate/severe symptoms | Symptom follow-up visit |

### 1. Get Patient HOPE Assessments

Retrieve all HOPE assessments for a patient.

**Endpoint:** `GET /patients/:id/hope-assessments`

**Permissions:** `VIEW_PATIENT` or `VIEW_CLINICAL_NOTES`

**Request Example:**

```bash
curl -X GET http://localhost:3000/api/patients/1/hope-assessments \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "assessment_type": "ADMISSION",
      "assessment_status": "SIGNED",
      "assessment_date": "2024-01-15T10:00:00Z",
      "due_date": "2024-01-20T23:59:59Z",
      "completed_date": "2024-01-15T15:30:00Z",
      "functional_self_care": {
        "eating": 2,
        "bathing": 4,
        "dressing": 3,
        "toileting": 2,
        "transferring": 3
      },
      "cognitive_status": "MODERATELY_IMPAIRED",
      "bims_score": 8,
      "phq2_total_score": 4,
      "pain_present": true,
      "pain_severity": "MODERATE",
      "symptoms": {
        "dyspnea": { "severity": "MODERATE", "frequency": "FREQUENTLY" },
        "fatigue": { "severity": "SEVERE", "frequency": "ALMOST_CONSTANTLY" }
      },
      "signature": {
        "signedBy": "user123",
        "signedByName": "Jane Doe, RN",
        "signedAt": "2024-01-15T15:30:00Z",
        "signatureType": "ELECTRONIC",
        "signatureHash": "a3f8d..."
      },
      "submitted_to_iqies": true,
      "submission_date": "2024-01-15T16:00:00Z",
      "created_by_id": "user123",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T16:00:00Z"
    }
  ]
}
```

---

### 2. Create Admission Assessment

Create ADMISSION assessment (within 5 days of admission).

**Endpoint:** `POST /patients/:id/hope-assessments/admission`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "patient_age": 78,
  "patient_gender": "FEMALE",
  "patient_race": "WHITE",
  "patient_ethnicity": "NON_HISPANIC",
  "primary_diagnosis": "Metastatic lung cancer",
  "caregiver_available": true,
  "caregiver_relationship": "SPOUSE",
  "caregiver_hours_per_week": 168,
  "functional_self_care": {
    "eating": 2,
    "bathing": 4,
    "dressing": 3,
    "toileting": 2,
    "transferring": 3
  },
  "functional_mobility": {
    "walking": 5,
    "wheelchair_use": 2,
    "bed_mobility": 3
  },
  "cognitive_status": "MODERATELY_IMPAIRED",
  "bims_score": 8,
  "phq2_little_interest": 2,
  "phq2_feeling_down": 2,
  "phq2_total_score": 4,
  "pain_present": true,
  "pain_severity": "MODERATE",
  "pain_frequency": "FREQUENTLY",
  "pain_interference": 6,
  "symptoms": {
    "dyspnea": { "severity": "MODERATE", "frequency": "FREQUENTLY" },
    "fatigue": { "severity": "SEVERE", "frequency": "ALMOST_CONSTANTLY" },
    "anxiety": { "severity": "MILD", "frequency": "OCCASIONALLY" }
  },
  "spiritual_assessment": "Patient identifies as Catholic, wants priest visits",
  "social_assessment": "Strong family support, adult children visit daily",
  "safety_assessment": "Home is safe, grab bars installed",
  "environment_assessment": "Patient has hospital bed in living room"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Admission assessment created",
  "data": {
    "id": 1,
    "patient_id": 1,
    "assessment_type": "ADMISSION",
    "assessment_status": "IN_PROGRESS",
    "assessment_date": "2024-01-15T10:00:00Z",
    "due_date": "2024-01-20T23:59:59Z",
    "functional_self_care": { ... },
    "created_by_id": "user123",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 3. Create HUV1 Assessment

Create HUV1 assessment (days 6-15 after admission).

**Endpoint:** `POST /patients/:id/hope-assessments/huv1`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:** (Similar structure to Admission assessment)

---

### 4. Create HUV2 Assessment

Create HUV2 assessment (days 16-30 after admission).

**Endpoint:** `POST /patients/:id/hope-assessments/huv2`

**Permissions:** `CREATE_CLINICAL_NOTES`

---

### 5. Create Discharge Assessment

Create DISCHARGE assessment.

**Endpoint:** `POST /patients/:id/hope-assessments/discharge`

**Permissions:** `CREATE_CLINICAL_NOTES`

---

### 6. Create Symptom Follow-up Assessment

Create SFV assessment (within 48 hours of moderate/severe symptoms).

**Endpoint:** `POST /patients/:id/hope-assessments/sfv`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "sfv_trigger_date": "2024-01-20T14:30:00Z",
  "sfv_trigger_symptoms": "Severe dyspnea, Moderate pain",
  "pain_present": true,
  "pain_severity": "MODERATE",
  "symptoms": {
    "dyspnea": { "severity": "SEVERE", "frequency": "FREQUENTLY" },
    "pain": { "severity": "MODERATE", "frequency": "OCCASIONALLY" }
  },
  "assessment_notes": "Patient experiencing increased dyspnea, oxygen increased to 4L"
}
```

---

### 7. Get Assessment by ID

Retrieve specific HOPE assessment.

**Endpoint:** `GET /hope-assessments/:id`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": {
    "id": 1,
    "patient_id": 1,
    "assessment_type": "ADMISSION",
    ...
  }
}
```

---

### 8. Update Assessment

Update HOPE assessment (unsigned only).

**Endpoint:** `PATCH /hope-assessments/:id`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "pain_severity": "SEVERE",
  "pain_interference": 8,
  "assessment_status": "COMPLETED"
}
```

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Assessment updated",
  "data": { ... }
}
```

**Error Response (403 Forbidden):**

```json
{
  "status": 403,
  "message": "Cannot update signed or submitted assessments"
}
```

---

### 9. Sign Assessment

Sign assessment with 21 CFR Part 11 compliant electronic signature.

**Endpoint:** `POST /hope-assessments/:id/sign`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Assessment signed successfully",
  "data": {
    "id": 1,
    "assessment_status": "SIGNED",
    "signature": {
      "signedBy": "user123",
      "signedByName": "Jane Doe, RN",
      "signedAt": "2024-01-15T15:30:00Z",
      "signatureType": "ELECTRONIC",
      "signatureHash": "a3f8d7c2b1...",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "meaning": "Signature attesting to the accuracy and completeness of this HOPE assessment",
      "credentials": "RN"
    }
  }
}
```

---

### 10. Submit Assessment to iQIES

Submit signed assessment to CMS iQIES system.

**Endpoint:** `POST /hope-assessments/:id/submit`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Assessment submitted to iQIES",
  "data": {
    "assessment": { ... },
    "submission": {
      "id": 1,
      "hope_assessment_id": 1,
      "submission_date": "2024-01-15T16:00:00Z",
      "submission_status": "PENDING",
      "submission_payload": { ... }
    }
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "status": 400,
  "message": "Assessment must be signed before submission"
}
```

---

### 11. Get Pending Assessments

Retrieve all pending (not completed) assessments.

**Endpoint:** `GET /hope-assessments/pending`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 2,
      "patient_id": 2,
      "assessment_type": "HUV1",
      "assessment_status": "IN_PROGRESS",
      "due_date": "2024-01-22T23:59:59Z"
    }
  ],
  "count": 1
}
```

---

### 12. Get Overdue Assessments

Retrieve all overdue assessments (past due date).

**Endpoint:** `GET /hope-assessments/overdue`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 3,
      "patient_id": 3,
      "assessment_type": "ADMISSION",
      "assessment_status": "IN_PROGRESS",
      "due_date": "2024-01-10T23:59:59Z",
      "days_overdue": 7
    }
  ],
  "count": 1
}
```

---

### 13. Get Compliance Metrics

Retrieve HOPE compliance metrics (90% threshold requirement).

**Endpoint:** `GET /hope-assessments/compliance`

**Query Parameters:**
- `period_start` (optional) - Start date (YYYY-MM-DD)
- `period_end` (optional) - End date (YYYY-MM-DD)
- `assessment_type` (optional) - Filter by type

**Permissions:** `VIEW_REPORTS`

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api/hope-assessments/compliance?period_start=2024-01-01&period_end=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "reporting_period_start": "2024-01-01",
      "reporting_period_end": "2024-01-31",
      "assessment_type": "ADMISSION",
      "total_due": 45,
      "total_completed": 43,
      "total_overdue": 2,
      "compliance_rate": 95.6,
      "meets_threshold": true,
      "threshold_percentage": 90.0,
      "penalty_risk": false
    }
  ]
}
```

---

## Encounters API

Clinical encounter documentation - **CRITICAL for billing**.

### Encounter Types

- `ADMISSION_VISIT` - Initial admission visit
- `ROUTINE_VISIT` - Regular scheduled visit
- `PRN_VISIT` - As-needed visit
- `COMPREHENSIVE_ASSESSMENT` - Full assessment visit
- `RECERTIFICATION_VISIT` - Recertification assessment
- `DEATH_VISIT` - Time of death visit
- `BEREAVEMENT_VISIT` - Family support visit

### Disciplines

- `REGISTERED_NURSE` - RN visit
- `SOCIAL_WORKER` - MSW visit
- `CHAPLAIN` - Spiritual care visit
- `PHYSICIAN` - MD/DO visit
- `AIDE` - CNA/HHA visit
- `VOLUNTEER` - Volunteer visit

---

### 1. Get All Encounters

Retrieve all encounters with pagination and filters.

**Endpoint:** `GET /encounters`

**Query Parameters:**
- `patient_id` (optional) - Filter by patient
- `discipline` (optional) - Filter by discipline
- `status` (optional) - Filter by status
- `limit` (optional, default: 50) - Page size
- `offset` (optional, default: 0) - Page offset

**Permissions:** `VIEW_CLINICAL_NOTES`

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api/encounters?discipline=REGISTERED_NURSE&status=UNSIGNED&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "encounter_type": "ROUTINE_VISIT",
      "encounter_status": "UNSIGNED",
      "encounter_date": "2024-01-20T14:00:00Z",
      "encounter_duration_minutes": 45,
      "discipline": "REGISTERED_NURSE",
      "staff_name": "Jane Doe, RN",
      "subjective": "Patient reports increased pain in lower back...",
      "objective": "VS: BP 130/80, HR 72, RR 18, Temp 98.6F, O2 Sat 95% on 2L...",
      "assessment": "Pain management needs adjustment, patient stable overall",
      "plan": "Increase morphine dose, follow up in 3 days"
    }
  ],
  "count": 1
}
```

---

### 2. Create Encounter

Create new clinical encounter.

**Endpoint:** `POST /encounters`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "patient_id": 1,
  "encounter_type": "ROUTINE_VISIT",
  "encounter_date": "2024-01-20T14:00:00Z",
  "encounter_duration_minutes": 45,
  "visit_location": "PATIENT_HOME",
  "visit_address": "123 Main St, Anytown, ST 12345",
  "discipline": "REGISTERED_NURSE",
  "gps_check_in": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2024-01-20T14:00:00Z",
    "accuracy": 10
  },
  "gps_check_out": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "timestamp": "2024-01-20T14:45:00Z",
    "accuracy": 10
  },
  "subjective": "Patient reports increased pain in lower back, rating 7/10. States pain is constant, worse with movement. Denies shortness of breath. Family reports patient sleeping better with new medication regimen.",
  "objective": "Patient alert and oriented x3. Vital signs stable: BP 130/80, HR 72, RR 18, Temp 98.6F, O2 Sat 95% on 2L NC. Pain assessment: 7/10 lower back pain, worse with movement. Skin assessment: Stage 2 pressure ulcer on sacrum, 2cm x 1.5cm, wound care provided. Bowel sounds present x4 quadrants.",
  "assessment": "1. Increased pain likely related to position changes\n2. Pressure ulcer healing appropriately with current treatment\n3. Patient tolerating current medication regimen well\n4. Family demonstrates understanding of care plan",
  "plan": "1. Contact MD regarding pain increase, recommend increase morphine dose\n2. Continue current wound care protocol\n3. Educate family on repositioning techniques\n4. Follow up visit in 3 days to reassess pain management",
  "vital_signs": {
    "temperature": 98.6,
    "temperature_method": "ORAL",
    "heart_rate": 72,
    "heart_rhythm": "REGULAR",
    "blood_pressure_systolic": 130,
    "blood_pressure_diastolic": 80,
    "respiratory_rate": 18,
    "pulse_oximetry": 95,
    "pain_score": 7
  },
  "pain_assessment": {
    "has_pain": true,
    "pain_score": 7,
    "pain_location": "Lower back",
    "pain_character": "Constant, aching",
    "pain_duration": "Continuous",
    "pain_frequency": "CONSTANT",
    "pain_intervention": "Currently on morphine 15mg q4h",
    "pain_effectiveness": "Partial relief, seeking improvement"
  },
  "interventions": "Provided wound care to sacral pressure ulcer, repositioned patient, educated family on proper turning techniques, contacted MD for pain management adjustment",
  "patient_education": "Taught family about signs of worsening pressure ulcer, importance of repositioning every 2 hours",
  "family_present": ["Daughter", "Spouse"],
  "family_concerns": "Family concerned about pain management, educated on medication titration process"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Encounter created",
  "data": {
    "id": 1,
    "patient_id": 1,
    "encounter_status": "IN_PROGRESS",
    "staff_id": "user123",
    "staff_name": "Jane Doe",
    "created_by_id": "user123",
    "createdAt": "2024-01-20T14:45:00Z"
  }
}
```

---

### 3. Get Encounter by ID

Retrieve specific encounter with addendums and amendments.

**Endpoint:** `GET /encounters/:id`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": {
    "id": 1,
    "patient_id": 1,
    "encounter_type": "ROUTINE_VISIT",
    "encounter_status": "SIGNED",
    "subjective": "...",
    "objective": "...",
    "assessment": "...",
    "plan": "...",
    "signature": {
      "signedBy": "user123",
      "signedByName": "Jane Doe, RN",
      "signedAt": "2024-01-20T15:00:00Z",
      "signatureHash": "abc123..."
    },
    "addendums": [
      {
        "id": 1,
        "addendum_date": "2024-01-20T16:00:00Z",
        "addendum_reason": "Additional information",
        "addendum_content": "Patient called at 4pm reporting pain relief after medication increase"
      }
    ],
    "amendments": []
  }
}
```

---

### 4. Update Encounter

Update encounter (unsigned only).

**Endpoint:** `PATCH /encounters/:id`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "assessment": "Updated assessment after consultation with MD",
  "plan": "Modified plan based on MD recommendations"
}
```

**Error Response (403 Forbidden):**

```json
{
  "status": 403,
  "message": "Cannot update signed encounters. Use amendments instead."
}
```

---

### 5. Delete Encounter

Soft delete encounter (unsigned only).

**Endpoint:** `DELETE /encounters/:id`

**Permissions:** `DELETE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Encounter deleted"
}
```

---

### 6. Sign Encounter

Sign encounter with electronic signature.

**Endpoint:** `POST /encounters/:id/sign`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Encounter signed successfully",
  "data": {
    "id": 1,
    "encounter_status": "SIGNED",
    "signature": {
      "signedBy": "user123",
      "signedByName": "Jane Doe, RN",
      "signedAt": "2024-01-20T15:00:00Z",
      "signatureType": "ELECTRONIC",
      "signatureHash": "a3f8d7c2b1e9...",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "meaning": "Signature attesting to the accuracy and completeness of this clinical encounter",
      "credentials": "RN"
    }
  }
}
```

---

### 7. Cosign Encounter

Cosign encounter (for supervision, students).

**Endpoint:** `POST /encounters/:id/cosign`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Encounter cosigned successfully",
  "data": {
    "id": 1,
    "encounter_status": "COSIGNED",
    "cosigner_id": "supervisor456",
    "cosigner_name": "Dr. John Smith, MD",
    "cosignature": {
      "signedBy": "supervisor456",
      "signedByName": "Dr. John Smith, MD",
      "signedAt": "2024-01-20T16:00:00Z",
      "signatureType": "COSIGNATURE",
      "meaning": "Cosignature attesting to the review and supervision of this clinical encounter"
    }
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "status": 400,
  "message": "Encounter must be signed before cosigning"
}
```

---

### 8. Add Addendum

Add addendum to signed encounter (additional information).

**Endpoint:** `POST /encounters/:id/addendum`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "addendum_reason": "Additional patient contact",
  "addendum_content": "Patient called at 4pm reporting complete pain relief after medication increase. No adverse effects noted. Patient and family satisfied with current management plan."
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Addendum added successfully",
  "data": {
    "id": 1,
    "encounter_id": 1,
    "addendum_date": "2024-01-20T16:00:00Z",
    "addendum_reason": "Additional patient contact",
    "addendum_content": "Patient called at 4pm...",
    "added_by_name": "Jane Doe, RN",
    "signature": {
      "signedBy": "user123",
      "signatureHash": "def456..."
    }
  }
}
```

---

### 9. Add Amendment

Amend signed encounter (correct errors).

**Endpoint:** `POST /encounters/:id/amendments`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "amendment_reason": "Correction of medication dose",
  "field_amended": "plan",
  "original_value": "Increase morphine dose to 15mg q4h",
  "amended_value": "Increase morphine dose to 20mg q4h",
  "amendment_notes": "Dose was transcribed incorrectly, corrected per MD order"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Amendment added successfully",
  "data": {
    "id": 1,
    "encounter_id": 1,
    "amendment_date": "2024-01-20T17:00:00Z",
    "amendment_reason": "Correction of medication dose",
    "field_amended": "plan",
    "original_value": "Increase morphine dose to 15mg q4h",
    "amended_value": "Increase morphine dose to 20mg q4h",
    "amended_by_name": "Jane Doe, RN",
    "signature": {
      "signedBy": "user123",
      "signatureHash": "ghi789..."
    }
  }
}
```

---

### 10. Get Unsigned Encounters

Retrieve all unsigned encounters.

**Endpoint:** `GET /encounters/unsigned`

**Query Parameters:**
- `discipline` (optional) - Filter by discipline
- `staff_id` (optional) - Filter by staff member

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 2,
      "patient_id": 2,
      "encounter_type": "ROUTINE_VISIT",
      "encounter_status": "UNSIGNED",
      "encounter_date": "2024-01-21T10:00:00Z",
      "staff_name": "Jane Doe, RN",
      "discipline": "REGISTERED_NURSE"
    }
  ],
  "count": 1
}
```

---

### 11. Get Encounters by Discipline

Retrieve encounters filtered by discipline.

**Endpoint:** `GET /encounters/by-discipline`

**Query Parameters:**
- `discipline` (required) - Discipline to filter by

**Permissions:** `VIEW_CLINICAL_NOTES`

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api/encounters/by-discipline?discipline=REGISTERED_NURSE" \
  -H "Authorization: Bearer <token>"
```

---

### 12. Get Patient Encounters

Retrieve all encounters for a specific patient.

**Endpoint:** `GET /patients/:id/encounters`

**Permissions:** `VIEW_PATIENT` or `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "encounter_type": "ROUTINE_VISIT",
      "encounter_date": "2024-01-20T14:00:00Z",
      "discipline": "REGISTERED_NURSE",
      "staff_name": "Jane Doe, RN",
      "encounter_status": "SIGNED"
    },
    {
      "id": 2,
      "encounter_type": "ROUTINE_VISIT",
      "encounter_date": "2024-01-23T10:00:00Z",
      "discipline": "SOCIAL_WORKER",
      "staff_name": "Bob Wilson, MSW",
      "encounter_status": "SIGNED"
    }
  ],
  "count": 2
}
```

---

## Care Planning API

Patient-centered care planning - **Medicare requirement for all hospice patients**.

### Care Plan Workflow

1. **DRAFT** - Initial creation
2. **PENDING_SIGNATURE** - Awaiting RN and Physician signatures
3. **SIGNED** - Both signatures obtained, plan active
4. **REVISED** - Plan updated, new version created
5. **INACTIVE** - Plan superseded by newer version

---

### 1. Get Patient Care Plans

Retrieve all care plans for a patient.

**Endpoint:** `GET /patients/:id/care-plans`

**Permissions:** `VIEW_PATIENT` or `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "care_plan_status": "SIGNED",
      "version": 1,
      "effective_date": "2024-01-15",
      "next_review_date": "2024-04-15",
      "patient_goals": "Manage pain, maintain comfort, spend quality time with family",
      "goals_of_care": "Focus on comfort and quality of life",
      "team_members": [
        {
          "role": "Medical Director",
          "name": "Dr. Smith",
          "discipline": "PHYSICIAN",
          "phone": "555-0100"
        },
        {
          "role": "Primary Nurse",
          "name": "Jane Doe",
          "discipline": "REGISTERED_NURSE",
          "phone": "555-0101"
        }
      ],
      "code_status": "DNR",
      "dnr_status": "Full DNR on file",
      "physician_signature": {
        "signedBy": "dr_smith",
        "signedByName": "Dr. John Smith, MD",
        "signedAt": "2024-01-15T14:00:00Z"
      },
      "rn_signature": {
        "signedBy": "user123",
        "signedByName": "Jane Doe, RN",
        "signedAt": "2024-01-15T13:00:00Z"
      }
    }
  ]
}
```

---

### 2. Create Care Plan

Create new care plan for patient.

**Endpoint:** `POST /patients/:id/care-plans`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "effective_date": "2024-01-15",
  "patient_goals": "Pain management, maintain dignity, spend time with grandchildren",
  "family_goals": "Ensure patient is comfortable, be present during final days",
  "goals_of_care": "Focus on comfort and quality of life, not life-prolonging measures",
  "philosophy_of_care": "Patient-centered, holistic approach addressing physical, emotional, and spiritual needs",
  "team_members": [
    {
      "role": "Medical Director",
      "name": "Dr. John Smith",
      "discipline": "PHYSICIAN",
      "phone": "555-0100"
    },
    {
      "role": "Primary Nurse",
      "name": "Jane Doe",
      "discipline": "REGISTERED_NURSE",
      "phone": "555-0101"
    },
    {
      "role": "Social Worker",
      "name": "Bob Wilson",
      "discipline": "SOCIAL_WORKER",
      "phone": "555-0102"
    }
  ],
  "advance_directives_on_file": true,
  "advance_directive_types": ["LIVING_WILL", "HEALTHCARE_PROXY", "DNR"],
  "code_status": "DNR",
  "dnr_status": "Full DNR on file, signed by patient and physician",
  "terminal_diagnosis": "Metastatic lung cancer with brain metastases",
  "related_diagnoses": ["COPD", "Hypertension", "Chronic pain"],
  "prognosis": "Life expectancy less than 6 months",
  "pain_management_approach": "Multi-modal pain management with opioids, adjuvants, and non-pharmacological interventions",
  "symptom_management_approach": "Proactive symptom management, anticipatory prescribing, 24/7 on-call support",
  "psychosocial_plan": "Weekly social work visits, family counseling as needed, grief support",
  "spiritual_plan": "Chaplain visits per patient preference, facilitate clergy visits",
  "safety_plan": "Fall prevention, infection control, medication safety",
  "bereavement_plan": "13-month bereavement program for family, support groups available",
  "bereavement_risk_level": "MODERATE"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Care plan created",
  "data": {
    "id": 1,
    "patient_id": 1,
    "care_plan_status": "DRAFT",
    "version": 1,
    "effective_date": "2024-01-15",
    "created_by_id": "user123",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

---

### 3. Get Care Plan by ID

Retrieve care plan with related problems, goals, and interventions.

**Endpoint:** `GET /care-plans/:id`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": {
    "id": 1,
    "patient_id": 1,
    "care_plan_status": "SIGNED",
    "version": 1,
    "effective_date": "2024-01-15",
    "patient_goals": "...",
    "problems": [
      {
        "id": 1,
        "problem_name": "Uncontrolled pain",
        "problem_priority": 1,
        "problem_status": "ACTIVE",
        "identified_date": "2024-01-15"
      }
    ],
    "goals": [
      {
        "id": 1,
        "goal_description": "Patient will report pain level 3/10 or less within 48 hours",
        "goal_type": "SHORT_TERM",
        "target_date": "2024-01-17",
        "goal_status": "IN_PROGRESS"
      }
    ],
    "interventions": [
      {
        "id": 1,
        "intervention_description": "Administer morphine per MD order, assess pain q4h",
        "intervention_type": "PHARMACOLOGICAL",
        "frequency": "Q4H_PRN",
        "responsible_discipline": "REGISTERED_NURSE"
      }
    ],
    "revisions": []
  }
}
```

---

### 4. Update Care Plan

Update care plan (draft only).

**Endpoint:** `PATCH /care-plans/:id`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "pain_management_approach": "Updated approach including nerve block consultation",
  "next_review_date": "2024-02-15"
}
```

**Error Response (403 Forbidden):**

```json
{
  "status": 403,
  "message": "Cannot update signed care plans. Create a revision instead."
}
```

---

### 5. Sign Care Plan

Sign care plan (RN or Physician signature).

**Endpoint:** `POST /care-plans/:id/sign`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "signature_type": "RN"
}
```

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Care plan rn signature added",
  "data": {
    "id": 1,
    "care_plan_status": "PENDING_SIGNATURE",
    "rn_signature": {
      "signedBy": "user123",
      "signedByName": "Jane Doe, RN",
      "signedAt": "2024-01-15T13:00:00Z",
      "signatureHash": "abc123..."
    }
  }
}
```

**Note:** Care plan status becomes "SIGNED" when both RN and Physician signatures are obtained.

---

### 6. Recertify Care Plan

Create new version for Medicare recertification period.

**Endpoint:** `POST /care-plans/:id/recertify`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "recertification_date": "2024-04-15",
  "revision_reason": "Medicare recertification - 90 day period"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Care plan recertified",
  "data": {
    "id": 2,
    "patient_id": 1,
    "version": 2,
    "care_plan_status": "DRAFT",
    "effective_date": "2024-04-15",
    "previous_version_id": 1,
    "revision_reason": "Medicare recertification - 90 day period"
  }
}
```

---

### 7. Get Patient Problems

Retrieve all problems for a patient.

**Endpoint:** `GET /patients/:id/problems`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "care_plan_id": 1,
      "problem_name": "Uncontrolled pain",
      "problem_description": "Patient experiencing severe lower back pain, 8/10 on pain scale",
      "problem_priority": 1,
      "problem_status": "ACTIVE",
      "problem_category": "PHYSICAL",
      "identified_date": "2024-01-15",
      "identified_by_id": "user123",
      "related_to": "Metastatic bone disease"
    }
  ]
}
```

---

### 8. Create Problem

Add problem to patient's problem list.

**Endpoint:** `POST /patients/:id/problems`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "care_plan_id": 1,
  "problem_name": "Caregiver stress",
  "problem_description": "Spouse showing signs of caregiver burnout, needs additional support",
  "problem_priority": 2,
  "problem_category": "PSYCHOSOCIAL",
  "identified_date": "2024-01-20",
  "related_to": "24/7 care responsibilities"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Problem created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "problem_name": "Caregiver stress",
    "problem_status": "ACTIVE",
    "identified_by_id": "user123",
    "createdAt": "2024-01-20T10:00:00Z"
  }
}
```

---

### 9. Get Patient Goals

Retrieve all goals for a patient.

**Endpoint:** `GET /patients/:id/goals`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "care_plan_id": 1,
      "problem_id": 1,
      "goal_description": "Patient will report pain level 3/10 or less within 48 hours",
      "goal_type": "SHORT_TERM",
      "goal_category": "PHYSICAL",
      "goal_status": "MET",
      "start_date": "2024-01-15",
      "target_date": "2024-01-17",
      "achievement_date": "2024-01-16",
      "responsible_discipline": "REGISTERED_NURSE"
    }
  ]
}
```

---

### 10. Create Goal

Add goal to care plan.

**Endpoint:** `POST /patients/:id/goals`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "care_plan_id": 1,
  "problem_id": 1,
  "goal_description": "Patient will maintain pain level at 3/10 or less for 7 consecutive days",
  "goal_type": "LONG_TERM",
  "goal_category": "PHYSICAL",
  "start_date": "2024-01-17",
  "target_date": "2024-01-24",
  "responsible_discipline": "REGISTERED_NURSE",
  "measurable_criteria": "Pain assessment scores documented q4h, average daily score ≤3/10"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Goal created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "goal_description": "Patient will maintain pain level at 3/10 or less...",
    "goal_status": "IN_PROGRESS",
    "createdAt": "2024-01-17T10:00:00Z"
  }
}
```

---

### 11. Get Patient Interventions

Retrieve all interventions for a patient.

**Endpoint:** `GET /patients/:id/interventions`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "care_plan_id": 1,
      "goal_id": 1,
      "intervention_description": "Administer morphine 15mg PO q4h per MD order",
      "intervention_type": "PHARMACOLOGICAL",
      "intervention_category": "PAIN_MANAGEMENT",
      "frequency": "Q4H",
      "responsible_discipline": "REGISTERED_NURSE",
      "start_date": "2024-01-15",
      "intervention_status": "ACTIVE"
    }
  ]
}
```

---

### 12. Create Intervention

Add intervention to care plan.

**Endpoint:** `POST /patients/:id/interventions`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "care_plan_id": 1,
  "goal_id": 1,
  "intervention_description": "Provide relaxation techniques and guided imagery for pain management",
  "intervention_type": "NON_PHARMACOLOGICAL",
  "intervention_category": "PAIN_MANAGEMENT",
  "frequency": "DAILY",
  "responsible_discipline": "REGISTERED_NURSE",
  "start_date": "2024-01-18",
  "instructions": "Teach patient deep breathing exercises, provide calming music, dim lights"
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Intervention created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "intervention_description": "Provide relaxation techniques...",
    "intervention_status": "ACTIVE",
    "createdAt": "2024-01-18T10:00:00Z"
  }
}
```

---

## IDG Meetings API

Interdisciplinary Group team meetings - **HIGH priority (14-day compliance rule)**.

All hospice patients must be reviewed by the IDG team at least every 14 days.

---

### 1. Get All IDG Meetings

Retrieve all IDG meetings with pagination.

**Endpoint:** `GET /idg-meetings`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "meeting_type": "ROUTINE",
      "meeting_status": "COMPLETED",
      "meeting_date": "2024-01-22",
      "meeting_time": "10:00:00",
      "meeting_duration_minutes": 90,
      "facilitator_name": "Dr. Smith",
      "patient_census": 45,
      "patients_reviewed_count": 45,
      "all_patients_reviewed": true,
      "next_meeting_date": "2024-01-29"
    }
  ],
  "count": 1
}
```

---

### 2. Create IDG Meeting

Schedule new IDG meeting.

**Endpoint:** `POST /idg-meetings`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "meeting_type": "ROUTINE",
  "meeting_date": "2024-01-29",
  "meeting_time": "10:00:00",
  "meeting_duration_minutes": 90,
  "location": "Conference Room A",
  "virtual_meeting": false,
  "facilitator_id": "user123",
  "facilitator_name": "Dr. John Smith",
  "agenda": "1. Review all active patients\n2. Discuss new admissions\n3. Quality improvement initiatives\n4. Staff updates",
  "topics": [
    "Patient reviews",
    "New admissions",
    "Quality metrics",
    "Staff concerns"
  ]
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "IDG meeting created",
  "data": {
    "id": 2,
    "meeting_type": "ROUTINE",
    "meeting_status": "SCHEDULED",
    "meeting_date": "2024-01-29",
    "created_by_id": "user123",
    "createdAt": "2024-01-22T14:00:00Z"
  }
}
```

---

### 3. Get IDG Meeting by ID

Retrieve specific meeting details.

**Endpoint:** `GET /idg-meetings/:id`

**Permissions:** `VIEW_CLINICAL_NOTES`

---

### 4. Update IDG Meeting

Update meeting details.

**Endpoint:** `PATCH /idg-meetings/:id`

**Permissions:** `UPDATE_CLINICAL_NOTES`

---

### 5. Start IDG Meeting

Mark meeting as in progress.

**Endpoint:** `POST /idg-meetings/:id/start`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Meeting started",
  "data": {
    "id": 1,
    "meeting_status": "IN_PROGRESS",
    "updatedAt": "2024-01-22T10:00:00Z"
  }
}
```

---

### 6. Complete IDG Meeting

Mark meeting as completed with outcomes.

**Endpoint:** `POST /idg-meetings/:id/complete`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "meeting_outcomes": "All 45 patients reviewed, 3 patients identified for increased services, 1 patient nearing active dying phase",
  "decisions_made": "Increase aide visits for Patient #23 to 5x/week, Schedule family meeting for Patient #12, Begin bereavement planning for Patient #8"
}
```

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Meeting completed",
  "data": {
    "id": 1,
    "meeting_status": "COMPLETED",
    "meeting_outcomes": "All 45 patients reviewed...",
    "decisions_made": "Increase aide visits...",
    "updatedAt": "2024-01-22T11:30:00Z"
  }
}
```

---

### 7. Get Meeting Attendees

Retrieve all attendees for a meeting.

**Endpoint:** `GET /idg-meetings/:id/attendees`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "idg_meeting_id": 1,
      "staff_id": "user123",
      "staff_name": "Dr. John Smith",
      "discipline": "PHYSICIAN",
      "role": "Medical Director",
      "attendance_status": "PRESENT"
    },
    {
      "id": 2,
      "idg_meeting_id": 1,
      "staff_name": "Jane Doe",
      "discipline": "REGISTERED_NURSE",
      "role": "Clinical Director",
      "attendance_status": "PRESENT"
    }
  ]
}
```

---

### 8. Add Meeting Attendee

Add attendee to meeting.

**Endpoint:** `POST /idg-meetings/:id/attendees`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "staff_id": "user456",
  "staff_name": "Bob Wilson",
  "discipline": "SOCIAL_WORKER",
  "role": "MSW",
  "attendance_status": "PRESENT"
}
```

---

### 9. Get Patient Reviews

Retrieve all patient reviews for a meeting.

**Endpoint:** `GET /idg-meetings/:id/reviews`

**Permissions:** `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "idg_meeting_id": 1,
      "patient_id": 1,
      "review_order": 1,
      "review_status": "COMPLETED",
      "presented_by_name": "Jane Doe, RN",
      "review_date": "2024-01-22",
      "patient_status_summary": "Stable, pain well controlled",
      "care_plan_changes": "No changes needed",
      "medications_reviewed": true,
      "psychosocial_updates": "Family coping well",
      "spiritual_updates": "Chaplain visits weekly",
      "recommendations": "Continue current plan of care",
      "next_review_date": "2024-02-05",
      "review_completed": true
    }
  ]
}
```

---

### 10. Add Patient Review

Add patient to meeting review list.

**Endpoint:** `POST /idg-meetings/:id/reviews`

**Permissions:** `CREATE_CLINICAL_NOTES`

**Request Body:**

```json
{
  "patient_id": 1,
  "review_order": 1,
  "patient_status_summary": "Patient stable on current medication regimen, pain controlled at 2-3/10",
  "recent_visits_summary": "RN visited 3x this week, all visits documented and signed",
  "current_symptoms": "Mild fatigue, occasional dyspnea with exertion, pain well controlled",
  "care_plan_changes": "No changes recommended at this time",
  "medications_reviewed": true,
  "medication_changes": "None",
  "dme_needs": "None identified",
  "psychosocial_updates": "Family coping appropriately, spouse receives weekly respite care",
  "spiritual_updates": "Patient receives weekly chaplain visits, finds them comforting",
  "safety_concerns": "None identified",
  "recommendations": "Continue current plan of care, next IDG review in 14 days",
  "action_items": [
    {
      "item": "Schedule respite care for next week",
      "assignedTo": "Social Worker",
      "dueDate": "2024-01-26",
      "status": "PENDING"
    }
  ]
}
```

**Response (201 Created):**

```json
{
  "status": 201,
  "message": "Patient review added",
  "data": {
    "id": 1,
    "idg_meeting_id": 1,
    "patient_id": 1,
    "review_status": "IN_PROGRESS",
    "presented_by_id": "user123",
    "presented_by_name": "Jane Doe",
    "createdAt": "2024-01-22T10:15:00Z"
  }
}
```

---

### 11. Complete Patient Review

Mark patient review as completed.

**Endpoint:** `POST /idg-meetings/:id/reviews/:patientId/complete`

**Permissions:** `UPDATE_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "message": "Patient review completed",
  "data": {
    "id": 1,
    "review_status": "COMPLETED",
    "review_completed": true,
    "completed_date": "2024-01-22T10:30:00Z"
  }
}
```

---

### 12. Get Overdue IDG Reviews

Retrieve patients overdue for 14-day review.

**Endpoint:** `GET /idg/overdue`

**Permissions:** `VIEW_REPORTS`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 5,
      "patient_name": "Smith, John",
      "last_review_date": "2024-01-05",
      "next_review_due_date": "2024-01-19",
      "days_overdue": 3,
      "is_overdue": true,
      "compliance_status": "NON_COMPLIANT",
      "assigned_nurse": "Jane Doe"
    }
  ],
  "count": 1
}
```

---

### 13. Get IDG Meeting Schedule

Retrieve meeting schedule for date range.

**Endpoint:** `GET /idg/schedule`

**Query Parameters:**
- `start_date` (optional) - Start date (YYYY-MM-DD)
- `end_date` (optional) - End date (YYYY-MM-DD)

**Permissions:** `VIEW_CLINICAL_NOTES`

**Request Example:**

```bash
curl -X GET "http://localhost:3000/api/idg/schedule?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer <token>"
```

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "meeting_type": "ROUTINE",
      "meeting_status": "COMPLETED",
      "meeting_date": "2024-01-08",
      "meeting_time": "10:00:00"
    },
    {
      "id": 2,
      "meeting_type": "ROUTINE",
      "meeting_status": "COMPLETED",
      "meeting_date": "2024-01-15",
      "meeting_time": "10:00:00"
    },
    {
      "id": 3,
      "meeting_type": "ROUTINE",
      "meeting_status": "COMPLETED",
      "meeting_date": "2024-01-22",
      "meeting_time": "10:00:00"
    },
    {
      "id": 4,
      "meeting_type": "ROUTINE",
      "meeting_status": "SCHEDULED",
      "meeting_date": "2024-01-29",
      "meeting_time": "10:00:00"
    }
  ]
}
```

---

### 14. Get Patient IDG Reviews

Retrieve IDG review history for a specific patient.

**Endpoint:** `GET /patients/:id/idg-reviews`

**Permissions:** `VIEW_PATIENT` or `VIEW_CLINICAL_NOTES`

**Response (200 OK):**

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "idg_meeting_id": 1,
      "patient_id": 1,
      "review_date": "2024-01-22",
      "review_status": "COMPLETED",
      "patient_status_summary": "Stable, pain well controlled",
      "recommendations": "Continue current plan of care",
      "next_review_date": "2024-02-05"
    },
    {
      "id": 2,
      "idg_meeting_id": 2,
      "patient_id": 1,
      "review_date": "2024-02-05",
      "review_status": "COMPLETED",
      "patient_status_summary": "Declining, increased pain",
      "recommendations": "Increase pain medication, add MSW visits",
      "next_review_date": "2024-02-19"
    }
  ]
}
```

---

### 15. Get IDG Compliance Dashboard

**Note:** This endpoint may not exist in the current implementation but would be valuable for compliance tracking.

**Suggested Endpoint:** `GET /idg/compliance`

**Purpose:** Track overall IDG compliance metrics

**Suggested Response:**

```json
{
  "status": 200,
  "data": {
    "total_active_patients": 45,
    "patients_compliant": 42,
    "patients_overdue": 3,
    "compliance_rate": 93.3,
    "meets_threshold": true,
    "threshold_percentage": 90.0,
    "upcoming_reviews_7_days": 15,
    "last_meeting_date": "2024-01-22",
    "next_meeting_date": "2024-01-29"
  }
}
```

---

## Data Models

### HOPEAssessment

```typescript
interface HOPEAssessment {
  id: number;
  patient_id: number;
  assessment_type: 'ADMISSION' | 'HUV1' | 'HUV2' | 'DISCHARGE' | 'SYMPTOM_FOLLOWUP';
  assessment_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'OVERDUE';
  assessment_date: string; // ISO 8601
  due_date?: string;
  completed_date?: string;

  // Demographics
  patient_age?: number;
  patient_gender?: string;
  patient_race?: string;
  patient_ethnicity?: string;
  primary_diagnosis?: string;

  // Caregiver
  caregiver_available?: boolean;
  caregiver_relationship?: string;
  caregiver_hours_per_week?: number;

  // Functional status (0-6 scale)
  functional_self_care?: {
    eating: number;
    bathing: number;
    dressing: number;
    toileting: number;
    transferring: number;
  };

  functional_mobility?: {
    walking: number;
    wheelchair_use: number;
    bed_mobility: number;
  };

  // Cognitive status
  cognitive_status?: 'INTACT' | 'BORDERLINE_INTACT' | 'MODERATELY_IMPAIRED' | 'SEVERELY_IMPAIRED';
  bims_score?: number; // 0-15

  // Mood (PHQ-2)
  phq2_little_interest?: number; // 0-3
  phq2_feeling_down?: number; // 0-3
  phq2_total_score?: number; // 0-6

  // Pain
  pain_present?: boolean;
  pain_severity?: 'NONE' | 'MILD' | 'MODERATE' | 'SEVERE' | 'VERY_SEVERE';
  pain_frequency?: 'NEVER' | 'RARELY' | 'OCCASIONALLY' | 'FREQUENTLY' | 'ALMOST_CONSTANTLY';
  pain_interference?: number; // 0-10

  // Symptoms
  symptoms?: {
    dyspnea?: { severity: string; frequency: string };
    nausea?: { severity: string; frequency: string };
    fatigue?: { severity: string; frequency: string };
    anxiety?: { severity: string; frequency: string };
    // ... other symptoms
  };

  // SFV tracking
  sfv_triggered?: boolean;
  sfv_trigger_date?: string;
  sfv_trigger_symptoms?: string;

  // Comprehensive assessments
  spiritual_assessment?: string;
  social_assessment?: string;
  safety_assessment?: string;
  environment_assessment?: string;

  // Signature
  signature?: ElectronicSignature;

  // Submission
  submitted_to_iqies?: boolean;
  submission_id?: string;
  submission_date?: string;

  // Audit
  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Encounter

```typescript
interface Encounter {
  id: number;
  patient_id: number;
  encounter_type: 'ADMISSION_VISIT' | 'ROUTINE_VISIT' | 'PRN_VISIT' | 'COMPREHENSIVE_ASSESSMENT' | 'RECERTIFICATION_VISIT' | 'DEATH_VISIT' | 'BEREAVEMENT_VISIT';
  encounter_status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'UNSIGNED' | 'SIGNED' | 'COSIGNED' | 'AMENDED' | 'CANCELLED';
  encounter_date: string;
  encounter_duration_minutes?: number;

  // Visit info
  visit_location?: 'PATIENT_HOME' | 'ASSISTED_LIVING_FACILITY' | 'NURSING_HOME' | 'HOSPITAL' | 'OFFICE';
  visit_address?: string;
  discipline: 'REGISTERED_NURSE' | 'SOCIAL_WORKER' | 'CHAPLAIN' | 'PHYSICIAN' | 'AIDE' | 'VOLUNTEER';

  // Staff
  staff_id?: string;
  staff_name?: string;
  staff_credentials?: string;
  cosigner_id?: string;
  cosigner_name?: string;

  // GPS verification
  gps_check_in?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy: number;
  };
  gps_check_out?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    accuracy: number;
  };

  // SOAP documentation
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;

  // Vital signs
  vital_signs?: {
    temperature?: number;
    temperature_method?: string;
    heart_rate?: number;
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    respiratory_rate?: number;
    pulse_oximetry?: number;
    pain_score?: number;
  };

  // Pain assessment
  pain_assessment?: {
    has_pain: boolean;
    pain_score?: number;
    pain_location?: string;
    pain_character?: string;
    pain_intervention?: string;
  };

  // Symptoms
  symptoms?: {
    dyspnea?: { present: boolean; severity: string; intervention: string };
    nausea?: { present: boolean; severity: string; intervention: string };
    // ... other symptoms
  };

  // Clinical details
  interventions?: string;
  patient_education?: string;
  family_present?: string[];
  family_concerns?: string;

  // Signatures
  signature?: ElectronicSignature;
  cosignature?: ElectronicSignature;

  // Amendment tracking
  amended?: boolean;
  amendment_count?: number;

  // Audit
  deleted_at?: string;
  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### CarePlan

```typescript
interface CarePlan {
  id: number;
  patient_id: number;
  care_plan_status: 'DRAFT' | 'ACTIVE' | 'REVISED' | 'INACTIVE' | 'ARCHIVED' | 'PENDING_SIGNATURE' | 'SIGNED';
  version: number;
  effective_date: string; // YYYY-MM-DD
  review_date?: string;
  next_review_date?: string;

  // Goals
  patient_goals?: string;
  family_goals?: string;
  goals_of_care?: string;

  // Philosophy
  philosophy_of_care?: string;
  approach_to_care?: string;

  // Team
  team_members?: {
    role: string;
    name: string;
    discipline: string;
    phone: string;
  }[];

  // Advance directives
  advance_directives_on_file?: boolean;
  advance_directive_types?: string[];
  code_status?: string;
  dnr_status?: string;

  // Clinical
  terminal_diagnosis?: string;
  related_diagnoses?: string[];
  prognosis?: string;
  clinical_summary?: string;

  // Management approaches
  pain_management_approach?: string;
  symptom_management_approach?: string;
  psychosocial_plan?: string;
  spiritual_plan?: string;

  // Safety
  safety_plan?: string;
  fall_prevention?: string;

  // Bereavement
  bereavement_plan?: string;
  bereavement_risk_level?: 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

  // Signatures
  physician_signature?: ElectronicSignature;
  rn_signature?: ElectronicSignature;
  patient_signature?: ElectronicSignature;

  // Versioning
  previous_version_id?: number;
  revision_reason?: string;
  recertification_date?: string;
  recertified_by_id?: string;

  // Audit
  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Problem

```typescript
interface Problem {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  problem_name: string;
  problem_description?: string;
  problem_priority?: number;
  problem_status: 'ACTIVE' | 'RESOLVED' | 'INACTIVE';
  problem_category: 'PHYSICAL' | 'PSYCHOSOCIAL' | 'SPIRITUAL' | 'ENVIRONMENTAL' | 'OTHER';
  identified_date: string;
  identified_by_id?: string;
  resolved_date?: string;
  related_to?: string;

  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Goal

```typescript
interface Goal {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  problem_id?: number;
  goal_description: string;
  goal_type: 'SHORT_TERM' | 'LONG_TERM';
  goal_category: 'PHYSICAL' | 'PSYCHOSOCIAL' | 'SPIRITUAL' | 'FUNCTIONAL' | 'OTHER';
  goal_status: 'IN_PROGRESS' | 'MET' | 'PARTIALLY_MET' | 'NOT_MET' | 'DISCONTINUED';
  start_date: string;
  target_date?: string;
  achievement_date?: string;
  responsible_discipline?: string;
  responsible_staff_id?: string;
  measurable_criteria?: string;

  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### Intervention

```typescript
interface Intervention {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  goal_id?: number;
  intervention_description: string;
  intervention_type: 'PHARMACOLOGICAL' | 'NON_PHARMACOLOGICAL' | 'THERAPEUTIC' | 'EDUCATIONAL' | 'SUPPORTIVE';
  intervention_category: 'PAIN_MANAGEMENT' | 'SYMPTOM_MANAGEMENT' | 'PSYCHOSOCIAL' | 'SPIRITUAL' | 'SAFETY' | 'OTHER';
  frequency?: string;
  responsible_discipline?: string;
  responsible_staff_id?: string;
  start_date: string;
  end_date?: string;
  intervention_status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED';
  instructions?: string;

  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### IDGMeeting

```typescript
interface IDGMeeting {
  id: number;
  meeting_type: 'INITIAL' | 'ROUTINE' | 'RECERTIFICATION' | 'EMERGENCY' | 'SPECIAL';
  meeting_status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  meeting_date: string; // YYYY-MM-DD
  meeting_time?: string; // HH:MM:SS
  meeting_duration_minutes?: number;

  // Location
  location?: string;
  virtual_meeting?: boolean;
  meeting_link?: string;

  // Facilitator
  facilitator_id?: string;
  facilitator_name?: string;

  // Content
  agenda?: string;
  topics?: string[];
  general_discussion?: string;
  quality_issues?: string;

  // Action items
  action_items?: {
    item: string;
    assignedTo: string;
    dueDate: string;
    status: string;
  }[];

  // Census
  patient_census?: number;
  new_admissions_count?: number;
  discharges_count?: number;
  deaths_count?: number;

  // Outcomes
  meeting_outcomes?: string;
  decisions_made?: string;

  // Next meeting
  next_meeting_date?: string;
  next_meeting_agenda?: string;

  // Compliance
  all_patients_reviewed?: boolean;
  patients_reviewed_count?: number;
  patients_missed_count?: number;

  // Documentation
  meeting_notes?: string;
  minutes_prepared_by_id?: string;
  minutes_approved?: boolean;

  // Audit
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### IDGPatientReview

```typescript
interface IDGPatientReview {
  id: number;
  idg_meeting_id: number;
  patient_id: number;
  review_order?: number;
  review_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
  review_date: string;

  // Presenter
  presented_by_id?: string;
  presented_by_name?: string;

  // Review content
  patient_status_summary?: string;
  recent_visits_summary?: string;
  current_symptoms?: string;
  care_plan_changes?: string;

  // Clinical updates
  medications_reviewed?: boolean;
  medication_changes?: string;
  dme_needs?: string;

  // Team updates
  psychosocial_updates?: string;
  spiritual_updates?: string;

  // Safety & recommendations
  safety_concerns?: string;
  recommendations?: string;

  // Action items
  action_items?: {
    item: string;
    assignedTo: string;
    dueDate: string;
    status: string;
  }[];

  // Tracking
  review_completed?: boolean;
  completed_date?: string;
  next_review_date?: string;

  // Audit
  created_by_id: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

### ElectronicSignature

```typescript
interface ElectronicSignature {
  signedBy: string;
  signedByName: string;
  signedAt: string; // ISO 8601
  signatureType: 'ELECTRONIC' | 'VERBAL' | 'WRITTEN' | 'ATTESTATION' | 'COSIGNATURE';
  signatureHash: string; // SHA-256 hash
  ipAddress: string;
  userAgent: string;
  meaning: string;
  credentials?: string;
}
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": 400,
  "message": "Assessment must be signed before submission"
}
```

---

### 401 Unauthorized

```json
{
  "status": 401,
  "message": "Missing or invalid authentication token"
}
```

---

### 403 Forbidden

```json
{
  "status": 403,
  "message": "Cannot update signed assessments"
}
```

---

### 404 Not Found

```json
{
  "status": 404,
  "message": "Assessment not found"
}
```

---

### 500 Internal Server Error

```json
{
  "status": 500,
  "message": "Error creating assessment",
  "error": "Detailed error message (development only)"
}
```

---

## Code Examples

### JavaScript (Fetch API)

```javascript
// Create HOPE Admission Assessment
const createAdmissionAssessment = async (patientId, assessmentData) => {
  const response = await fetch(`http://localhost:3000/api/patients/${patientId}/hope-assessments/admission`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(assessmentData)
  });

  return response.json();
};

// Sign HOPE Assessment
const signAssessment = async (assessmentId) => {
  const response = await fetch(`http://localhost:3000/api/hope-assessments/${assessmentId}/sign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
};

// Get Overdue Assessments
const getOverdueAssessments = async () => {
  const response = await fetch('http://localhost:3000/api/hope-assessments/overdue', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
};
```

---

### Node.js (Axios)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create Encounter
const createEncounter = async (encounterData) => {
  const response = await api.post('/encounters', encounterData);
  return response.data;
};

// Sign Encounter
const signEncounter = async (encounterId) => {
  const response = await api.post(`/encounters/${encounterId}/sign`);
  return response.data;
};

// Add Addendum
const addAddendum = async (encounterId, addendumData) => {
  const response = await api.post(`/encounters/${encounterId}/addendum`, addendumData);
  return response.data;
};

// Get Unsigned Encounters
const getUnsignedEncounters = async (discipline) => {
  const response = await api.get('/encounters/unsigned', {
    params: { discipline }
  });
  return response.data;
};
```

---

### Python (requests)

```python
import requests

BASE_URL = 'http://localhost:3000/api'
HEADERS = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Create Care Plan
def create_care_plan(patient_id, care_plan_data):
    response = requests.post(
        f'{BASE_URL}/patients/{patient_id}/care-plans',
        headers=HEADERS,
        json=care_plan_data
    )
    return response.json()

# Sign Care Plan
def sign_care_plan(care_plan_id, signature_type='RN'):
    response = requests.post(
        f'{BASE_URL}/care-plans/{care_plan_id}/sign',
        headers=HEADERS,
        json={'signature_type': signature_type}
    )
    return response.json()

# Create Problem
def create_problem(patient_id, problem_data):
    response = requests.post(
        f'{BASE_URL}/patients/{patient_id}/problems',
        headers=HEADERS,
        json=problem_data
    )
    return response.json()

# Get Patient Goals
def get_patient_goals(patient_id):
    response = requests.get(
        f'{BASE_URL}/patients/{patient_id}/goals',
        headers=HEADERS
    )
    return response.json()
```

---

### cURL

```bash
# Create IDG Meeting
curl -X POST http://localhost:3000/api/idg-meetings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_type": "ROUTINE",
    "meeting_date": "2024-01-29",
    "meeting_time": "10:00:00",
    "facilitator_name": "Dr. Smith"
  }'

# Start IDG Meeting
curl -X POST http://localhost:3000/api/idg-meetings/1/start \
  -H "Authorization: Bearer <token>"

# Add Patient Review
curl -X POST http://localhost:3000/api/idg-meetings/1/reviews \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 1,
    "patient_status_summary": "Stable, pain controlled",
    "recommendations": "Continue current plan"
  }'

# Get Overdue Reviews
curl -X GET http://localhost:3000/api/idg/overdue \
  -H "Authorization: Bearer <token>"
```

---

## Additional Resources

- **HOPE Assessment Documentation**: See CMS HOPE toolkit
- **21 CFR Part 11 Compliance**: Electronic signature requirements
- **Medicare CoPs**: Conditions of Participation for Hospice
- **RBAC Configuration**: See `/src/config/rbac.js`
- **Database Schema**: See `/docs/SCHEMA.md`
- **Testing Documentation**: See `/tests/README.md`

---

**Last Updated:** 2024-12-27
**API Version:** 1.0.0
**Contact:** api-support@hospice-ehr.com
