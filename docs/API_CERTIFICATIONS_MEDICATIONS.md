# API Documentation
## Certifications & Medications Modules

**Version:** 1.0.0
**Base URL:** `http://localhost:3000/api`
**Last Updated:** 2024-12-27

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Formats](#common-response-formats)
4. [Error Codes](#error-codes)
5. [Certifications API](#certifications-api)
6. [Face-to-Face Encounters API](#face-to-face-encounters-api)
7. [Orders API](#orders-api)
8. [Medications API](#medications-api)
9. [MAR (Medication Administration) API](#mar-api)
10. [Comfort Kits API](#comfort-kits-api)
11. [Medication Reconciliation API](#medication-reconciliation-api)
12. [Data Models](#data-models)
13. [Code Examples](#code-examples)

---

## Overview

This API provides endpoints for managing Medicare certifications, Face-to-Face encounters, physician orders, medications, and medication administration in a hospice EHR system.

### Key Features

- ✅ **Medicare Compliance**: Track certification periods (INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60)
- ✅ **Electronic Signatures**: 21 CFR Part 11 compliant with SHA-256 hashing
- ✅ **Face-to-Face Tracking**: Required encounters within 30 days of recertification
- ✅ **Controlled Substances**: DEA-compliant tracking and logging
- ✅ **MAR System**: Complete medication administration documentation
- ✅ **RBAC**: Role-based access control on all endpoints
- ✅ **Audit Logging**: Full audit trail for HIPAA compliance

---

## Authentication

All API endpoints require authentication via Bearer token.

### Headers Required

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

### Example

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     -H "Content-Type: application/json" \
     http://localhost:3000/api/patients/1/certifications
```

### RBAC Permissions

Most endpoints require one of these permissions:
- `VIEW_CLINICAL_NOTES` - Read access
- `CREATE_CLINICAL_NOTES` - Create access
- `UPDATE_CLINICAL_NOTES` - Update/sign access
- `DELETE_CLINICAL_NOTES` - Delete access

---

## Common Response Formats

### Success Response (200, 201)

```json
{
  "status": 200,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "count": 10  // Optional: for list responses
}
```

### Error Response (4xx, 5xx)

```json
{
  "status": 404,
  "message": "Resource not found",
  "error": "Detailed error message (development mode only)"
}
```

---

## Error Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data, validation failed |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Insufficient permissions (RBAC) |
| 404 | Not Found | Resource doesn't exist or deleted |
| 500 | Internal Server Error | Database error, unexpected exception |

---

## Certifications API

### Overview

Manage Medicare certification periods (INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60).

---

### GET /patients/:id/certifications

Retrieve all certifications for a patient.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/certifications
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "certification_period": "INITIAL_90",
      "certification_status": "ACTIVE",
      "start_date": "2024-01-01",
      "end_date": "2024-03-31",
      "terminal_illness_narrative": "Patient has end-stage heart failure...",
      "clinical_progression": "Progressive decline in functional status...",
      "decline_indicators": "Weight loss of 15 lbs, increasing dyspnea...",
      "physician_signature": {
        "signedBy": "user_123",
        "signedByName": "Dr. Jane Smith",
        "signedAt": "2024-01-01T10:30:00Z",
        "signatureType": "ELECTRONIC",
        "signatureHash": "a3b2c1d4e5f6...",
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "meaning": "Physician signature attesting to terminal illness...",
        "credentials": "Physician"
      },
      "created_by_id": "user_123",
      "updated_by_id": "user_123",
      "createdAt": "2024-01-01T09:00:00Z",
      "updatedAt": "2024-01-01T10:30:00Z"
    }
  ]
}
```

---

### POST /patients/:id/certifications

Create a new certification period.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/certifications
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "certification_period": "INITIAL_90",
  "start_date": "2024-01-01",
  "end_date": "2024-03-31",
  "terminal_illness_narrative": "Patient has end-stage heart failure with NYHA Class IV symptoms. Expected prognosis of 6 months or less based on clinical progression and declining functional status.",
  "clinical_progression": "Progressive decline in functional status over past 3 months. Multiple hospitalizations for acute decompensation.",
  "decline_indicators": "Weight loss of 15 lbs, increasing dyspnea at rest, decreased appetite, increased fatigue"
}
```

#### Validation Rules

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| certification_period | Yes | String | Must be: INITIAL_90, SUBSEQUENT_90, or SUBSEQUENT_60 |
| start_date | Yes | Date | ISO 8601 format (YYYY-MM-DD) |
| end_date | Yes | Date | ISO 8601 format (YYYY-MM-DD) |
| terminal_illness_narrative | Yes | String | Clinical justification for hospice |
| clinical_progression | No | String | Optional details |
| decline_indicators | No | String | Optional details |

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Certification created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "certification_period": "INITIAL_90",
    "certification_status": "PENDING",
    "start_date": "2024-01-01",
    "end_date": "2024-03-31",
    // ... other fields
  }
}
```

#### Special Behavior

- For **SUBSEQUENT** certifications, a recertification schedule entry is automatically created
- F2F due date is set to 30 days before recertification date
- Status defaults to `PENDING` until signed

---

### POST /certifications/:id/sign

Sign a certification with electronic signature.

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/certifications/1/sign
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Certification signed successfully",
  "data": {
    "id": 1,
    "certification_status": "ACTIVE",
    "physician_signature": {
      "signedBy": "user_123",
      "signedByName": "Dr. Jane Smith",
      "signedAt": "2024-01-01T10:30:00Z",
      "signatureType": "ELECTRONIC",
      "signatureHash": "a3b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "meaning": "Physician signature attesting to terminal illness and hospice appropriateness",
      "credentials": "Physician"
    }
  }
}
```

#### Signature Algorithm

1. Data to sign: `{ id, patient_id, certification_period, terminal_illness_narrative }`
2. Hash algorithm: SHA-256
3. Output: 64-character hexadecimal string
4. Status automatically updated to `ACTIVE`

---

### GET /certifications/due

Get certifications due within the next 30 days.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/certifications/due
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 3,
      "patient_id": 1,
      "certification_period": "SUBSEQUENT_60",
      "end_date": "2024-02-15",
      "days_until_due": 12
      // ... other fields
    }
  ],
  "count": 1
}
```

---

### GET /certifications/overdue

Get overdue certifications (past end_date and still PENDING or ACTIVE).

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/certifications/overdue
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 2,
      "patient_id": 5,
      "certification_period": "INITIAL_90",
      "certification_status": "PENDING",
      "end_date": "2024-01-15",
      "days_overdue": 5
      // ... other fields
    }
  ],
  "count": 1
}
```

---

## Face-to-Face Encounters API

### Overview

Track Face-to-Face encounters required within 30 days prior to recertification.

---

### GET /patients/:id/f2f

Get all Face-to-Face encounters for a patient.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/f2f
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "certification_id": 1,
      "encounter_date": "2024-03-01",
      "performed_by_id": "user_123",
      "performed_by_name": "Dr. Jane Smith",
      "performed_by_type": "PHYSICIAN",
      "visit_type": "IN_PERSON",
      "findings": "Patient examined in home. Continues to exhibit signs of end-stage heart failure...",
      "terminal_prognosis_confirmed": true,
      "attestation": null,
      "attestation_date": null,
      "createdAt": "2024-03-01T14:30:00Z"
    }
  ]
}
```

---

### POST /patients/:id/f2f

Create a Face-to-Face encounter.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/f2f
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "certification_id": 1,
  "encounter_date": "2024-03-01",
  "performed_by_name": "Dr. Jane Smith",
  "performed_by_type": "PHYSICIAN",
  "visit_type": "IN_PERSON",
  "findings": "Patient examined in home. Continues to exhibit signs of end-stage heart failure. Shortness of breath at rest, 2+ pitting edema bilateral lower extremities. Patient is appropriate for continued hospice care. Terminal prognosis confirmed.",
  "terminal_prognosis_confirmed": true
}
```

#### Validation Rules

| Field | Required | Type | Valid Values |
|-------|----------|------|--------------|
| encounter_date | Yes | Date | ISO 8601 format |
| performed_by_type | No | String | PHYSICIAN, NP, PA |
| visit_type | No | String | IN_PERSON, TELEHEALTH |
| findings | Yes | String | Clinical documentation |
| terminal_prognosis_confirmed | No | Boolean | Defaults to true |

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Face-to-Face encounter created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "encounter_date": "2024-03-01",
    // ... other fields
  }
}
```

#### Special Behavior

- If `certification_id` provided, updates recertification schedule to mark F2F as completed
- Defaults `visit_type` to `IN_PERSON`
- Defaults `terminal_prognosis_confirmed` to `true`

---

### POST /f2f/:id/attestation

Add hospice physician attestation to F2F encounter.

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/f2f/1/attestation
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Face-to-Face encounter attested successfully",
  "data": {
    "id": 1,
    "attestation": {
      "signedBy": "user_456",
      "signedByName": "Dr. Robert Williams",
      "signedAt": "2024-03-02T09:15:00Z",
      "signatureType": "ATTESTATION",
      "signatureHash": "b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3",
      "ipAddress": "192.168.1.5",
      "userAgent": "Mozilla/5.0...",
      "meaning": "Hospice physician attestation of Face-to-Face encounter findings",
      "credentials": "Hospice Physician"
    },
    "attestation_date": "2024-03-02"
  }
}
```

---

## Orders API

### Overview

Manage physician orders for medications, treatments, DME, etc.

---

### GET /patients/:id/orders

Get all orders for a patient with optional filtering.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/orders?status=ACTIVE&type=MEDICATION
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | String | Filter by order_status (ACTIVE, COMPLETED, DISCONTINUED, PENDING) |
| type | String | Filter by order_type (MEDICATION, DME, LABORATORY, etc.) |

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "order_type": "MEDICATION",
      "order_status": "ACTIVE",
      "order_priority": "ROUTINE",
      "order_description": "Morphine Sulfate 15mg PO every 4 hours PRN pain",
      "start_date": "2024-01-01",
      "end_date": null,
      "ordered_by_id": "user_123",
      "physician_signature": {
        // signature object
      },
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ]
}
```

---

### POST /patients/:id/orders

Create a new order.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/orders
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "order_type": "MEDICATION",
  "order_priority": "ROUTINE",
  "order_description": "Morphine Sulfate 15mg PO every 4 hours PRN pain",
  "start_date": "2024-01-01",
  "end_date": null
}
```

#### Verbal Order

```json
{
  "order_type": "MEDICATION",
  "order_priority": "URGENT",
  "order_description": "Lorazepam 0.5mg SL every 6 hours PRN anxiety",
  "start_date": "2024-01-15",
  "is_verbal_order": true,
  "physician_name": "Dr. Robert Williams",
  "read_back_verified": true
}
```

#### Order Types

- `MEDICATION` - Medication orders
- `TREATMENT` - Treatment orders
- `DME` - Durable Medical Equipment
- `LABORATORY` - Lab orders
- `IMAGING` - Imaging orders
- `CONSULTATION` - Consult orders

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Order created",
  "data": {
    "id": 3,
    "patient_id": 1,
    "order_type": "MEDICATION",
    "order_status": "ACTIVE",
    // ... other fields
  }
}
```

#### Special Behavior

- If `is_verbal_order: true`, creates `verbal_orders_tracking` entry
- Tracks read-back verification status
- CMS requires written signature within 48 hours

---

### POST /orders/:id/sign

Sign an order with physician signature.

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/orders/1/sign
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Order signed successfully",
  "data": {
    "id": 1,
    "physician_signature": {
      "signedBy": "user_123",
      "signedByName": "Dr. Jane Smith",
      "signedAt": "2024-01-01T09:30:00Z",
      "signatureType": "ELECTRONIC",
      "signatureHash": "c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "meaning": "Physician signature authorizing this order",
      "credentials": "Physician"
    }
  }
}
```

#### Special Behavior

- For verbal orders, updates `verbal_orders_tracking` table
- Sets `written_signature_obtained: true`
- Records `signature_obtained_date`

---

## Medications API

### Overview

Manage patient medications including controlled substances.

---

### GET /patients/:id/medications

Get all medications for a patient with optional filtering.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/medications?status=ACTIVE&is_hospice_related=true
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| status | String | ACTIVE, DISCONTINUED, COMPLETED, HELD, ON_HOLD |
| is_hospice_related | Boolean | Filter hospice vs non-hospice medications |

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "medication_name": "Morphine Sulfate",
      "generic_name": "morphine",
      "medication_status": "ACTIVE",
      "medication_route": "ORAL",
      "dosage": "15mg",
      "frequency": "Every 4 hours PRN",
      "instructions": "Take for moderate to severe pain. May cause drowsiness.",
      "start_date": "2024-01-01",
      "end_date": null,
      "discontinued_date": null,
      "discontinuation_reason": null,
      "controlled_schedule": "SCHEDULE_II",
      "is_hospice_related": true,
      "prescriber_id": "user_123",
      "order_id": 1,
      "createdAt": "2024-01-01T08:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /patients/:id/medications

Create a new medication.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/medications
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "medication_name": "Morphine Sulfate",
  "generic_name": "morphine",
  "medication_route": "ORAL",
  "dosage": "15mg",
  "frequency": "Every 4 hours PRN",
  "instructions": "Take for moderate to severe pain. May cause drowsiness.",
  "start_date": "2024-01-01",
  "controlled_schedule": "SCHEDULE_II",
  "is_hospice_related": true,
  "prescriber_id": "user_123",
  "order_id": 1,
  "initial_quantity": "120 tablets"
}
```

#### Controlled Schedules

- `SCHEDULE_II` - High abuse potential (morphine, oxycodone, etc.)
- `SCHEDULE_III` - Moderate abuse potential
- `SCHEDULE_IV` - Lower abuse potential
- `SCHEDULE_V` - Lowest abuse potential

#### Medication Routes

Common values: `ORAL`, `IV`, `IM`, `SQ`, `RECTAL`, `TOPICAL`, `SUBLINGUAL`, `TRANSDERMAL`

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Medication created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "medication_name": "Morphine Sulfate",
    "medication_status": "ACTIVE",
    // ... other fields
  }
}
```

#### Special Behavior

- For controlled substances, creates `controlled_substance_log` entry with action `DISPENSED`
- Defaults `medication_status` to `ACTIVE`
- Defaults `is_hospice_related` to `true`

---

### POST /patients/:id/medications/:medId/discontinue

Discontinue a medication.

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/medications/2/discontinue
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "reason": "No longer needed for symptom management"
}
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Medication discontinued",
  "data": {
    "id": 2,
    "medication_status": "DISCONTINUED",
    "discontinued_date": "2024-01-20",
    "discontinuation_reason": "No longer needed for symptom management"
  }
}
```

#### Special Behavior

- For controlled substances, creates `controlled_substance_log` entry with action `RETURNED`
- Sets `medication_status` to `DISCONTINUED`
- Sets `discontinued_date` to current date

---

### POST /patients/:id/medications/:medId/hold

Temporarily hold a medication.

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/medications/2/hold
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "reason": "Patient nausea, hold until resolved",
  "hold_until": "2024-01-25"
}
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Medication held",
  "data": {
    "id": 2,
    "medication_status": "HELD",
    "end_date": "2024-01-25",
    "instructions": "Take for moderate to severe pain.\nHeld: Patient nausea, hold until resolved"
  }
}
```

#### Special Behavior

- Sets `medication_status` to `HELD`
- Updates `end_date` to `hold_until` date
- Appends hold reason to instructions

---

## MAR API

### Overview

Medication Administration Record - document each medication administration.

---

### GET /patients/:id/mar

Get MAR entries for a patient with optional filtering.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/mar?start_date=2024-01-01&end_date=2024-01-31&medication_id=2
Authorization: Bearer <token>
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | Date | Filter by scheduled_time >= start_date |
| end_date | Date | Filter by scheduled_time <= end_date |
| medication_id | Integer | Filter by specific medication |

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "mar_entry": {
        "id": 1,
        "patient_id": 1,
        "medication_id": 2,
        "scheduled_time": "2024-01-15T10:00:00Z",
        "actual_time": "2024-01-15T10:05:00Z",
        "mar_status": "GIVEN",
        "dosage_given": "15mg",
        "route_used": "ORAL",
        "administered_by_id": "user_123",
        "administered_by_name": "Nurse Johnson",
        "reason_not_given": null,
        "patient_response": "Patient tolerated medication well. Pain reduced from 8/10 to 4/10 after 30 minutes.",
        "createdAt": "2024-01-15T10:05:00Z"
      },
      "medication": {
        "id": 2,
        "medication_name": "Morphine Sulfate",
        "dosage": "15mg",
        "frequency": "Every 4 hours PRN"
      }
    }
  ],
  "count": 1
}
```

---

### POST /patients/:id/mar

Record a medication administration.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request - Medication Given

```http
POST /api/patients/1/mar
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "medication_id": 2,
  "scheduled_time": "2024-01-15T10:00:00Z",
  "actual_time": "2024-01-15T10:05:00Z",
  "mar_status": "GIVEN",
  "dosage_given": "15mg",
  "route_used": "ORAL",
  "administered_by_name": "Nurse Johnson",
  "patient_response": "Patient tolerated medication well. Pain reduced from 8/10 to 4/10 after 30 minutes."
}
```

#### Request - Medication Refused

```json
{
  "medication_id": 2,
  "scheduled_time": "2024-01-15T14:00:00Z",
  "mar_status": "REFUSED",
  "administered_by_name": "Nurse Johnson",
  "reason_not_given": "Patient stated pain level only 2/10, declined medication at this time."
}
```

#### MAR Status Values

| Status | Description | Requires reason_not_given |
|--------|-------------|---------------------------|
| GIVEN | Medication administered | No |
| NOT_GIVEN | Medication not administered | Yes |
| REFUSED | Patient refused medication | Yes |
| HELD | Medication held by nurse | Yes |
| LATE | Administered late | No |
| MISSED | Scheduled but missed | No |

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "MAR entry created",
  "data": {
    "id": 3,
    "patient_id": 1,
    "medication_id": 2,
    "mar_status": "GIVEN",
    // ... other fields
  }
}
```

#### Validation

- `reason_not_given` **required** when status is `NOT_GIVEN`, `REFUSED`, or `HELD`
- `actual_time` defaults to current time if not provided
- `administered_by_id` defaults to authenticated user

---

## Comfort Kits API

### Overview

Manage emergency medication kits for hospice patients.

---

### GET /patients/:id/comfort-kit

Get all comfort kits for a patient.

**Permissions:** `VIEW_CLINICAL_NOTES`

#### Request

```http
GET /api/patients/1/comfort-kit
Authorization: Bearer <token>
```

#### Response (200 OK)

```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 1,
      "kit_number": "CK-2024-001",
      "issue_date": "2024-01-01",
      "expiration_date": "2024-07-01",
      "status": "ACTIVE",
      "medications": [
        {
          "medication": "Morphine Sulfate Concentrate 20mg/mL",
          "quantity": "30mL bottle",
          "lot_number": "LOT123456",
          "ndc": "00054-3589-49"
        },
        {
          "medication": "Lorazepam 2mg/mL",
          "quantity": "10mL bottle",
          "lot_number": "LOT789012",
          "ndc": "00054-3587-49"
        }
      ],
      "location": "Patient home - refrigerator",
      "createdAt": "2024-01-01T09:00:00Z"
    }
  ],
  "count": 1
}
```

---

### POST /patients/:id/comfort-kit

Create a comfort kit.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/comfort-kit
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "kit_number": "CK-2024-001",
  "issue_date": "2024-01-01",
  "expiration_date": "2024-07-01",
  "medications": [
    {
      "medication": "Morphine Sulfate Concentrate 20mg/mL",
      "quantity": "30mL bottle",
      "lot_number": "LOT123456",
      "ndc": "00054-3589-49"
    },
    {
      "medication": "Lorazepam 2mg/mL",
      "quantity": "10mL bottle",
      "lot_number": "LOT789012",
      "ndc": "00054-3587-49"
    },
    {
      "medication": "Haloperidol 5mg/mL",
      "quantity": "10mL bottle",
      "lot_number": "LOT345678",
      "ndc": "00054-8132-49"
    },
    {
      "medication": "Atropine 1% drops",
      "quantity": "15mL bottle",
      "lot_number": "LOT901234",
      "ndc": "17478-0711-12"
    }
  ],
  "location": "Patient home - refrigerator"
}
```

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Comfort kit created",
  "data": {
    "id": 2,
    "patient_id": 1,
    "kit_number": "CK-2024-001",
    "status": "ACTIVE",
    // ... other fields
  }
}
```

---

### POST /patients/:id/comfort-kit/destroy

Destroy a comfort kit (controlled substance disposal).

**Permissions:** `UPDATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/comfort-kit/destroy
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "kit_id": 1,
  "witness_id": "user_789",
  "witness_name": "Pharmacist Brown",
  "destruction_notes": "Patient deceased. All remaining medications destroyed per policy. Two-person verification completed."
}
```

#### Response (200 OK)

```json
{
  "status": 200,
  "message": "Comfort kit destroyed and logged",
  "data": {
    "id": 1,
    "status": "DESTROYED",
    "updatedAt": "2024-02-15T14:00:00Z"
  }
}
```

#### Special Behavior

- Updates kit `status` to `DESTROYED`
- Creates `controlled_substance_log` entry for **each medication** in the kit
- Action: `DESTROYED`
- Requires witness information for DEA compliance

---

## Medication Reconciliation API

### Overview

CMS-required medication reconciliation at admission, transfer, and discharge.

---

### POST /patients/:id/medication-reconciliation

Create a medication reconciliation.

**Permissions:** `CREATE_CLINICAL_NOTES`

#### Request

```http
POST /api/patients/1/medication-reconciliation
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "reconciliation_type": "ADMISSION",
  "medications_reviewed": [
    {
      "medication": "Metoprolol 25mg BID",
      "action": "CONTINUED",
      "reason": "Patient taking at home, continue for heart failure management"
    },
    {
      "medication": "Warfarin 5mg daily",
      "action": "DISCONTINUED",
      "reason": "No longer appropriate for hospice care, goals of care discussion with family"
    },
    {
      "medication": "Morphine Sulfate 15mg q4h PRN",
      "action": "ADDED",
      "reason": "New hospice medication for pain management"
    },
    {
      "medication": "Furosemide 40mg daily",
      "action": "MODIFIED",
      "reason": "Dose reduced from 80mg to 40mg for comfort care"
    }
  ],
  "discrepancies_found": "Patient had been taking OTC ibuprofen not documented in previous records. Family provided medication list.",
  "actions_taken": "Updated medication list in chart. Educated family on appropriate pain management with prescribed opioids. Discontinued ibuprofen due to GI risk.",
  "performed_by_name": "Nurse Johnson RN"
}
```

#### Reconciliation Types

- `ADMISSION` - At hospice admission
- `TRANSFER` - When transferring between levels of care
- `DISCHARGE` - At hospice discharge/revocation
- `ROUTINE` - Periodic reviews

#### Medication Actions

- `CONTINUED` - Continue current medication
- `DISCONTINUED` - Stop medication
- `ADDED` - Add new medication
- `MODIFIED` - Change dose, frequency, or route

#### Response (201 Created)

```json
{
  "status": 201,
  "message": "Medication reconciliation created",
  "data": {
    "id": 1,
    "patient_id": 1,
    "reconciliation_type": "ADMISSION",
    "reconciliation_date": "2024-01-01",
    "medications_reviewed": [
      // array of reviewed medications
    ],
    "performed_by_id": "user_123",
    "performed_by_name": "Nurse Johnson RN",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

---

## Data Models

### Certification

```typescript
{
  id: number;
  patient_id: number;
  certification_period: 'INITIAL_90' | 'SUBSEQUENT_90' | 'SUBSEQUENT_60';
  certification_status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REVOKED';
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  terminal_illness_narrative: string;
  clinical_progression?: string;
  decline_indicators?: string;
  physician_signature?: Signature;
  created_by_id: string;
  updated_by_id: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Face-to-Face Encounter

```typescript
{
  id: number;
  patient_id: number;
  certification_id?: number;
  encounter_date: string; // YYYY-MM-DD
  performed_by_id?: string;
  performed_by_name?: string;
  performed_by_type?: 'PHYSICIAN' | 'NP' | 'PA';
  visit_type?: 'IN_PERSON' | 'TELEHEALTH';
  findings: string;
  terminal_prognosis_confirmed: boolean;
  attestation?: Signature;
  attestation_date?: string;
  created_by_id: string;
  updated_by_id: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Order

```typescript
{
  id: number;
  patient_id: number;
  order_type: 'MEDICATION' | 'TREATMENT' | 'DME' | 'LABORATORY' | 'IMAGING' | 'CONSULTATION';
  order_status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED' | 'EXPIRED' | 'PENDING';
  order_priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  order_description: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string;
  ordered_by_id?: string;
  physician_signature?: Signature;
  created_by_id: string;
  updated_by_id: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Medication

```typescript
{
  id: number;
  patient_id: number;
  medication_name: string;
  generic_name?: string;
  medication_status: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED' | 'HELD' | 'ON_HOLD';
  medication_route?: string; // ORAL, IV, IM, SQ, etc.
  dosage?: string;
  frequency?: string;
  instructions?: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string;
  discontinued_date?: string;
  discontinuation_reason?: string;
  controlled_schedule?: 'SCHEDULE_II' | 'SCHEDULE_III' | 'SCHEDULE_IV' | 'SCHEDULE_V';
  is_hospice_related: boolean;
  prescriber_id?: string;
  order_id?: number;
  created_by_id: string;
  updated_by_id: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}
```

### MAR Entry

```typescript
{
  id: number;
  patient_id: number;
  medication_id: number;
  scheduled_time: string; // ISO 8601
  actual_time?: string; // ISO 8601
  mar_status: 'GIVEN' | 'NOT_GIVEN' | 'REFUSED' | 'HELD' | 'LATE' | 'MISSED';
  dosage_given?: string;
  route_used?: string;
  administered_by_id?: string;
  administered_by_name?: string;
  reason_not_given?: string; // Required for NOT_GIVEN, REFUSED, HELD
  patient_response?: string;
  created_by_id: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Signature

```typescript
{
  signedBy: string; // User ID
  signedByName: string; // Full name
  signedAt: string; // ISO 8601 timestamp
  signatureType: 'ELECTRONIC' | 'VERBAL' | 'WRITTEN' | 'ATTESTATION';
  signatureHash: string; // SHA-256 hash (64 chars)
  ipAddress: string;
  userAgent: string;
  meaning: string; // Purpose of signature
  credentials: string; // Role/title
}
```

---

## Code Examples

### JavaScript (Fetch API)

```javascript
// Create certification
const createCertification = async (patientId, certData) => {
  const response = await fetch(`http://localhost:3000/api/patients/${patientId}/certifications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(certData)
  });

  return response.json();
};

// Usage
const certification = await createCertification(1, {
  certification_period: 'INITIAL_90',
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  terminal_illness_narrative: 'Patient has end-stage heart failure...'
});
```

### Node.js (Axios)

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${process.env.AUTH_TOKEN}`
  }
});

// Record MAR entry
const recordMedication = async (patientId, marData) => {
  try {
    const response = await api.post(`/patients/${patientId}/mar`, marData);
    console.log('MAR entry created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error:', error.response.data);
    throw error;
  }
};

// Usage
await recordMedication(1, {
  medication_id: 2,
  scheduled_time: '2024-01-15T10:00:00Z',
  mar_status: 'GIVEN',
  dosage_given: '15mg',
  route_used: 'ORAL',
  patient_response: 'Patient tolerated well'
});
```

### Python (Requests)

```python
import requests
import os

BASE_URL = 'http://localhost:3000/api'
AUTH_TOKEN = os.getenv('AUTH_TOKEN')

headers = {
    'Authorization': f'Bearer {AUTH_TOKEN}',
    'Content-Type': 'application/json'
}

# Create medication
def create_medication(patient_id, med_data):
    url = f'{BASE_URL}/patients/{patient_id}/medications'
    response = requests.post(url, json=med_data, headers=headers)
    response.raise_for_status()
    return response.json()

# Usage
medication = create_medication(1, {
    'medication_name': 'Morphine Sulfate',
    'dosage': '15mg',
    'frequency': 'Every 4 hours PRN',
    'start_date': '2024-01-01',
    'controlled_schedule': 'SCHEDULE_II'
})
print(medication)
```

### cURL

```bash
# Create F2F encounter
curl -X POST http://localhost:3000/api/patients/1/f2f \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "encounter_date": "2024-03-01",
    "performed_by_type": "PHYSICIAN",
    "visit_type": "IN_PERSON",
    "findings": "Patient examined in home...",
    "terminal_prognosis_confirmed": true
  }'

# Sign certification
curl -X POST http://localhost:3000/api/certifications/1/sign \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Get MAR entries for date range
curl -X GET "http://localhost:3000/api/patients/1/mar?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## Rate Limiting

Current rate limits (configurable):
- **100 requests per minute** per IP address
- **429 Too Many Requests** response when exceeded

---

## Changelog

### Version 1.0.0 (2024-12-27)
- ✅ Initial release
- ✅ 21 endpoints for Certifications and Medications
- ✅ Full CRUD operations
- ✅ Electronic signatures
- ✅ Controlled substance tracking
- ✅ RBAC authorization
- ✅ Audit logging

---

## Support

For API questions or issues:
- 📧 Email: api-support@hospice-ehr.com
- 📚 Documentation: https://docs.hospice-ehr.com
- 🐛 Issues: https://github.com/hospice-ehr/issues

---

**Last Updated:** 2024-12-27
**API Version:** 1.0.0
