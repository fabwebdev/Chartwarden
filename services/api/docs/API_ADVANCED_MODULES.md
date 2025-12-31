# API Documentation
## Billing, Staff Management, Scheduling & Bereavement Modules

**Version:** 1.0.0
**Base URL:** `http://localhost:3000/api`
**Last Updated:** 2024-12-27

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Formats](#common-response-formats)
4. [Error Codes](#error-codes)
5. [Billing API](#billing-api)
6. [Staff Management API](#staff-management-api)
7. [Scheduling API](#scheduling-api)
8. [Bereavement API](#bereavement-api)
9. [Data Models](#data-models)
10. [Code Examples](#code-examples)

---

## Overview

This API provides endpoints for managing billing operations, staff management, scheduling, and bereavement services in a hospice EHR system.

### Modules Covered

#### 🧾 Billing Module
- Claims management (institutional/professional)
- Notice of Election (NOE) tracking
- Payment processing and application
- AR aging reports
- Contract management

#### 👥 Staff Management Module
- Staff profiles and credentials
- Caseload assignment
- Productivity tracking
- Training management
- Credential expiration alerts

#### 📅 Scheduling Module
- Visit scheduling with GPS tracking
- Recurring visit templates
- On-call schedule management
- Visit compliance monitoring
- RN visit frequency tracking

#### 💝 Bereavement Module
- 13-month bereavement case tracking (CMS requirement)
- Contact management for bereaved families
- Bereavement care plans
- Risk assessments with auto-scoring
- Support group management

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
     http://localhost:3000/api/claims
```

### RBAC Permissions

Endpoints require one or more of these permissions:
- `VIEW_CLINICAL_NOTES` - Read clinical data
- `CREATE_CLINICAL_NOTES` - Create clinical records
- `UPDATE_CLINICAL_NOTES` - Update clinical records
- `DELETE_CLINICAL_NOTES` - Delete clinical records
- `VIEW_USERS` - View staff information
- `UPDATE_USER` - Manage staff records
- `VIEW_PATIENT` - View patient data
- `UPDATE_PATIENT` - Update patient data
- `VIEW_REPORTS` - View compliance reports

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

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Billing API

### Claims Management

#### Get All Claims

```http
GET /api/claims?limit=50&offset=0&claim_status=PENDING
```

**Query Parameters:**
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `claim_status` (optional) - Filter by status: DRAFT, PENDING, SUBMITTED, PAID, DENIED
- `claim_type` (optional) - Filter by type: INSTITUTIONAL, PROFESSIONAL

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "patient_id": 123,
      "claim_number": "CLM-2024-001",
      "claim_type": "INSTITUTIONAL",
      "claim_status": "PENDING",
      "service_start_date": "2024-01-01",
      "service_end_date": "2024-01-31",
      "total_charges": 15000,
      "total_paid": 0,
      "submission_date": "2024-02-01",
      "createdAt": "2024-01-31T10:00:00Z"
    }
  ],
  "count": 1
}
```

---

#### Create Claim

```http
POST /api/claims
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "payer_id": 5,
  "claim_type": "INSTITUTIONAL",
  "service_start_date": "2024-01-01",
  "service_end_date": "2024-01-31",
  "total_charges": 15000,
  "claim_status": "DRAFT"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Claim created successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "claim_number": "CLM-2024-001",
    "claim_status": "DRAFT",
    "createdAt": "2024-01-31T10:00:00Z"
  }
}
```

---

#### Submit Claim

```http
POST /api/claims/:id/submit
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "message": "Claim submitted successfully",
  "data": {
    "id": 1,
    "claim_status": "SUBMITTED",
    "submission_date": "2024-02-01"
  }
}
```

---

### Notice of Election (NOE)

#### Create NOE

```http
POST /api/patients/:id/noe
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "noe_date": "2024-01-01",
  "effective_date": "2024-01-01",
  "noe_status": "PENDING",
  "noe_timeliness": "TIMELY",
  "payer_id": 5
}
```

**Response:**
```json
{
  "status": 201,
  "message": "NOE created successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "noe_date": "2024-01-01",
    "effective_date": "2024-01-01",
    "noe_status": "PENDING"
  }
}
```

---

### Payments

#### Get All Payments

```http
GET /api/payments
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "payer_id": 5,
      "payment_date": "2024-02-15",
      "payment_amount": 12000,
      "payment_method": "EFT",
      "payment_status": "POSTED",
      "check_number": "CHK-98765"
    }
  ]
}
```

---

#### Apply Payment to Claim

```http
POST /api/payments/:id/apply
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "claim_id": 1,
  "applied_amount": 12000,
  "adjustment_amount": 3000
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Payment applied successfully",
  "data": {
    "id": 1,
    "payment_id": 1,
    "claim_id": 1,
    "applied_amount": 12000
  }
}
```

---

### AR Aging Report

#### Get AR Aging

```http
GET /api/billing/ar-aging
```

**Permission:** `VIEW_REPORTS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "claim_id": 1,
      "balance": 3000,
      "days_outstanding": 45,
      "aging_bucket": "31-60",
      "calculated_date": "2024-03-15"
    }
  ]
}
```

---

## Staff Management API

### Staff Profiles

#### Get All Staff

```http
GET /api/staff?limit=50&offset=0
```

**Query Parameters:**
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `job_title` (optional) - Filter by job title
- `employment_status` (optional) - Filter by status: ACTIVE, INACTIVE, ON_LEAVE

**Permission:** `VIEW_USERS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "user_id": "user_123",
      "first_name": "Jane",
      "last_name": "Doe",
      "job_title": "RN",
      "employment_status": "ACTIVE",
      "hire_date": "2020-01-15",
      "phone": "(555) 123-4567",
      "email": "jane.doe@hospice.org"
    }
  ],
  "count": 1
}
```

---

#### Create Staff Profile

```http
POST /api/staff
```

**Permission:** `CREATE_USER`

**Request Body:**
```json
{
  "user_id": "user_123",
  "first_name": "Jane",
  "last_name": "Doe",
  "job_title": "RN",
  "employment_status": "ACTIVE",
  "hire_date": "2020-01-15",
  "phone": "(555) 123-4567",
  "email": "jane.doe@hospice.org",
  "license_number": "RN123456",
  "license_state": "CA"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Staff profile created successfully",
  "data": {
    "id": 1,
    "first_name": "Jane",
    "last_name": "Doe",
    "job_title": "RN"
  }
}
```

---

### Credentials

#### Get Staff Credentials

```http
GET /api/staff/:id/credentials
```

**Permission:** `VIEW_USERS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "staff_id": 1,
      "credential_type": "RN_LICENSE",
      "credential_number": "RN123456",
      "issuing_state": "CA",
      "issue_date": "2020-01-01",
      "expiration_date": "2025-01-01",
      "credential_status": "ACTIVE"
    }
  ]
}
```

---

#### Add Credential

```http
POST /api/staff/:id/credentials
```

**Permission:** `UPDATE_USER`

**Request Body:**
```json
{
  "credential_type": "RN_LICENSE",
  "credential_number": "RN123456",
  "issuing_state": "CA",
  "issue_date": "2020-01-01",
  "expiration_date": "2025-01-01"
}
```

---

#### Get Expiring Credentials

```http
GET /api/staff/credentials/expiring?days=90
```

**Query Parameters:**
- `days` (optional) - Number of days ahead to check (default: 90)

**Permission:** `VIEW_USERS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "staff_id": 1,
      "staff_name": "Jane Doe",
      "credential_type": "RN_LICENSE",
      "credential_number": "RN123456",
      "expiration_date": "2024-03-15",
      "days_until_expiration": 45
    }
  ]
}
```

---

### Caseload Management

#### Get Staff Caseload

```http
GET /api/staff/:id/caseload
```

**Permission:** `VIEW_PATIENT`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "staff_id": 1,
      "patient_id": 123,
      "patient_name": "John Smith",
      "role": "PRIMARY_RN",
      "assignment_date": "2024-01-01",
      "is_active": true
    }
  ]
}
```

---

#### Assign Patient to Staff

```http
POST /api/staff/:id/caseload
```

**Permission:** `UPDATE_PATIENT`

**Request Body:**
```json
{
  "patient_id": 123,
  "role": "PRIMARY_RN",
  "assignment_date": "2024-01-01"
}
```

---

## Scheduling API

### Visit Scheduling

#### Get All Visits

```http
GET /api/visits?staff_id=1&patient_id=123&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters:**
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `staff_id` (optional) - Filter by staff member
- `patient_id` (optional) - Filter by patient
- `visit_status` (optional) - Filter by status: SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
- `start_date` (optional) - Filter by date range start
- `end_date` (optional) - Filter by date range end

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "visit": {
        "id": 1,
        "patient_id": 123,
        "staff_id": 1,
        "visit_type": "SKILLED_NURSING",
        "visit_status": "SCHEDULED",
        "scheduled_date": "2024-01-15",
        "scheduled_start_time": "10:00:00",
        "estimated_duration_minutes": 60
      },
      "patient": {
        "id": 123,
        "first_name": "John",
        "last_name": "Smith"
      },
      "staff": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Doe",
        "job_title": "RN"
      }
    }
  ],
  "count": 1
}
```

---

#### Create Visit

```http
POST /api/visits
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "staff_id": 1,
  "visit_type": "SKILLED_NURSING",
  "scheduled_date": "2024-01-15",
  "scheduled_start_time": "10:00:00",
  "scheduled_end_time": "11:00:00",
  "estimated_duration_minutes": 60,
  "visit_purpose": "Pain assessment and medication review"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Visit scheduled successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "visit_status": "SCHEDULED",
    "scheduled_date": "2024-01-15"
  }
}
```

---

#### GPS Check-In

```http
POST /api/visits/:id/checkin
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 10.5
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Checked in successfully",
  "data": {
    "id": 1,
    "visit_status": "IN_PROGRESS",
    "actual_check_in_time": "2024-01-15T10:05:00Z",
    "check_in_location": {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy": 10.5
    }
  }
}
```

---

#### GPS Check-Out

```http
POST /api/visits/:id/checkout
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy": 8.2
}
```

**Response:**
```json
{
  "status": 200,
  "message": "Checked out successfully",
  "data": {
    "id": 1,
    "visit_status": "COMPLETED",
    "actual_check_out_time": "2024-01-15T11:10:00Z",
    "actual_duration_minutes": 65
  },
  "duration_minutes": 65
}
```

---

#### Cancel Visit

```http
POST /api/visits/:id/cancel
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "cancellation_reason": "Patient hospitalized"
}
```

---

#### Reschedule Visit

```http
POST /api/visits/:id/reschedule
```

**Permission:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "new_date": "2024-01-16",
  "new_time": "14:00:00",
  "reason": "Patient request"
}
```

**Response:**
```json
{
  "status": 201,
  "message": "Visit rescheduled successfully",
  "original_visit_id": 1,
  "new_visit": {
    "id": 2,
    "scheduled_date": "2024-01-16",
    "scheduled_start_time": "14:00:00"
  }
}
```

---

### Recurring Visits

#### Get Recurring Visit Templates

```http
GET /api/recurring-visits?patient_id=123
```

**Query Parameters:**
- `patient_id` (optional) - Filter by patient
- `is_active` (optional) - Filter by active status (true/false)

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "recurring": {
        "id": 1,
        "patient_id": 123,
        "visit_type": "SKILLED_NURSING",
        "recurrence_pattern": "WEEKLY",
        "days_of_week": ["MONDAY", "WEDNESDAY", "FRIDAY"],
        "start_date": "2024-01-01",
        "is_active": true
      },
      "patient": {
        "id": 123,
        "first_name": "John",
        "last_name": "Smith"
      }
    }
  ]
}
```

---

#### Create Recurring Visit Template

```http
POST /api/recurring-visits
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "staff_id": 1,
  "visit_type": "SKILLED_NURSING",
  "recurrence_pattern": "WEEKLY",
  "days_of_week": ["MONDAY", "WEDNESDAY", "FRIDAY"],
  "preferred_time": "10:00:00",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30"
}
```

---

### On-Call Management

#### Get Current On-Call Staff

```http
GET /api/on-call/current
```

**Permission:** `VIEW_USERS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "schedule": {
        "id": 1,
        "staff_id": 1,
        "on_call_type": "RN",
        "start_datetime": "2024-01-15T17:00:00Z",
        "end_datetime": "2024-01-16T08:00:00Z",
        "schedule_status": "ACTIVE"
      },
      "staff": {
        "id": 1,
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "(555) 123-4567",
        "mobile": "(555) 987-6543"
      }
    }
  ],
  "current_datetime": "2024-01-15T20:30:00Z"
}
```

---

#### Create On-Call Schedule

```http
POST /api/on-call
```

**Permission:** `UPDATE_USER`

**Request Body:**
```json
{
  "staff_id": 1,
  "on_call_type": "RN",
  "start_datetime": "2024-01-15T17:00:00Z",
  "end_datetime": "2024-01-16T08:00:00Z"
}
```

---

### Visit Compliance

#### Get Visit Compliance Reports

```http
GET /api/compliance/visits?is_compliant=false
```

**Query Parameters:**
- `patient_id` (optional) - Filter by patient
- `is_compliant` (optional) - Filter by compliance status (true/false)

**Permission:** `VIEW_REPORTS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "compliance": {
        "id": 1,
        "patient_id": 123,
        "period_start_date": "2024-01-01",
        "period_end_date": "2024-01-14",
        "required_visits": 2,
        "completed_visits": 1,
        "is_compliant": false,
        "compliance_percentage": 50,
        "rn_visit_overdue": true,
        "days_since_last_rn_visit": 16
      },
      "patient": {
        "first_name": "John",
        "last_name": "Smith",
        "medical_record_number": "MRN123456"
      }
    }
  ]
}
```

---

#### Get Overdue RN Visits

```http
GET /api/compliance/visits/rn-overdue
```

**Permission:** `VIEW_REPORTS`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "compliance": {
        "patient_id": 123,
        "days_since_last_rn_visit": 16,
        "last_rn_visit_date": "2023-12-30"
      },
      "patient": {
        "first_name": "John",
        "last_name": "Smith"
      }
    }
  ],
  "count": 1,
  "message": "RN visits overdue (>14 days)"
}
```

---

## Bereavement API

### Bereavement Cases

#### Get All Bereavement Cases

```http
GET /api/bereavement/cases?case_status=ACTIVE&service_level=HIGH_RISK
```

**Query Parameters:**
- `limit` (optional) - Results per page (default: 50)
- `offset` (optional) - Pagination offset (default: 0)
- `case_status` (optional) - Filter by status: ACTIVE, COMPLETED, CLOSED_EARLY
- `service_level` (optional) - Filter by level: STANDARD, ENHANCED, HIGH_RISK

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "case": {
        "id": 1,
        "patient_id": 123,
        "date_of_death": "2024-01-01",
        "bereavement_start_date": "2024-01-01",
        "bereavement_end_date": "2025-02-01",
        "case_status": "ACTIVE",
        "service_level": "HIGH_RISK",
        "services_offered": true,
        "services_declined": false
      },
      "patient": {
        "id": 123,
        "first_name": "Deceased",
        "last_name": "Patient",
        "medical_record_number": "MRN123456"
      }
    }
  ],
  "count": 1
}
```

---

#### Create Bereavement Case

```http
POST /api/bereavement/cases
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "date_of_death": "2024-01-01",
  "service_level": "STANDARD",
  "assigned_counselor_id": "user_456",
  "services_offered": true,
  "initial_assessment_notes": "Family appears to be coping well. Primary contact is spouse."
}
```

**Note:** The system automatically calculates:
- `bereavement_start_date` = `date_of_death`
- `bereavement_end_date` = 13 months after `date_of_death`

**Response:**
```json
{
  "status": 201,
  "message": "Bereavement case created successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "date_of_death": "2024-01-01",
    "bereavement_end_date": "2025-02-01",
    "case_status": "ACTIVE"
  }
}
```

---

### Bereavement Contacts

#### Get Case Contacts

```http
GET /api/bereavement/cases/:id/contacts
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "bereavement_case_id": 1,
      "first_name": "Mary",
      "last_name": "Smith",
      "relationship_to_deceased": "SPOUSE",
      "phone": "(555) 123-4567",
      "email": "mary.smith@email.com",
      "is_primary_contact": true,
      "wants_services": true,
      "preferred_contact_method": "PHONE"
    }
  ],
  "count": 1
}
```

---

#### Add Contact to Case

```http
POST /api/bereavement/cases/:id/contacts
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "first_name": "Mary",
  "last_name": "Smith",
  "relationship_to_deceased": "SPOUSE",
  "phone": "(555) 123-4567",
  "email": "mary.smith@email.com",
  "is_primary_contact": true,
  "wants_services": true,
  "preferred_contact_method": "PHONE",
  "preferred_language": "English"
}
```

---

### Bereavement Plans

#### Get Case Plans

```http
GET /api/bereavement/cases/:id/plans
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "bereavement_case_id": 1,
      "plan_date": "2024-01-15",
      "plan_status": "ACTIVE",
      "grief_stage": "DENIAL",
      "risk_level": "LOW",
      "goals": "Provide monthly phone contact and grief support materials",
      "recommended_frequency": "MONTHLY"
    }
  ]
}
```

---

#### Create Bereavement Plan

```http
POST /api/bereavement/cases/:id/plans
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "plan_date": "2024-01-15",
  "grief_stage": "DENIAL",
  "risk_level": "LOW",
  "goals": "Provide monthly phone contact and grief support materials",
  "planned_interventions": "Monthly phone calls, quarterly mailings, support group information",
  "recommended_frequency": "MONTHLY",
  "materials_provided": "Grief resource booklet, support group schedule"
}
```

---

### Bereavement Encounters

#### Get Case Encounters

```http
GET /api/bereavement/cases/:id/encounters
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "encounter": {
        "id": 1,
        "bereavement_case_id": 1,
        "bereavement_contact_id": 1,
        "encounter_date": "2024-02-01",
        "encounter_type": "PHONE_CALL",
        "duration_minutes": 20,
        "topics_discussed": "Current coping, support system, grief reactions",
        "contact_response": "RECEPTIVE",
        "follow_up_needed": false
      },
      "contact": {
        "first_name": "Mary",
        "last_name": "Smith",
        "relationship_to_deceased": "SPOUSE"
      }
    }
  ]
}
```

---

#### Create Encounter

```http
POST /api/bereavement/cases/:id/encounters
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "bereavement_contact_id": 1,
  "encounter_date": "2024-02-01",
  "encounter_type": "PHONE_CALL",
  "duration_minutes": 20,
  "counselor_id": "user_456",
  "topics_discussed": "Current coping, support system, grief reactions",
  "grief_assessment": "Contact appears to be progressing through normal grief. No concerning symptoms.",
  "contact_response": "RECEPTIVE",
  "follow_up_needed": false
}
```

**Encounter Types:**
- `PHONE_CALL`
- `HOME_VISIT`
- `OFFICE_VISIT`
- `MAILING`
- `EMAIL`
- `MEMORIAL_SERVICE`

---

### Risk Assessments

#### Get Case Risk Assessments

```http
GET /api/bereavement/cases/:id/risk-assessments
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "bereavement_case_id": 1,
      "assessment_date": "2024-01-15",
      "sudden_death": true,
      "traumatic_death": false,
      "child_death": false,
      "history_of_mental_illness": false,
      "limited_social_support": true,
      "total_risk_score": 2,
      "risk_level": "LOW",
      "recommended_interventions": "Standard bereavement support with monthly check-ins"
    }
  ]
}
```

---

#### Create Risk Assessment

```http
POST /api/bereavement/cases/:id/risk-assessments
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "bereavement_contact_id": 1,
  "assessment_date": "2024-01-15",
  "sudden_death": true,
  "traumatic_death": false,
  "suicide": false,
  "child_death": false,
  "multiple_losses": false,
  "history_of_mental_illness": false,
  "history_of_substance_abuse": false,
  "limited_social_support": true,
  "financial_stress": false,
  "caregiver_burden": false,
  "prolonged_grief": false,
  "depression_symptoms": false,
  "anxiety_symptoms": false,
  "suicidal_ideation": false,
  "functional_impairment": false
}
```

**Note:** The system automatically:
- Counts the number of `true` risk factors
- Calculates `total_risk_score`
- Assigns `risk_level`:
  - LOW: 0-3 risk factors
  - MODERATE: 4-7 risk factors
  - HIGH: 8+ risk factors

**Response:**
```json
{
  "status": 201,
  "message": "Risk assessment created successfully",
  "data": {
    "id": 1,
    "total_risk_score": 2,
    "risk_level": "LOW"
  }
}
```

---

### Support Groups

#### Get All Support Groups

```http
GET /api/bereavement/support-groups?group_status=ACTIVE&group_type=SPOUSE_LOSS
```

**Query Parameters:**
- `group_status` (optional) - Filter by status: ACTIVE, FULL, COMPLETED, CANCELLED
- `group_type` (optional) - Filter by type: GENERAL_GRIEF, SPOUSE_LOSS, PARENT_LOSS, CHILD_LOSS, SUICIDE_SURVIVORS

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "group_name": "Spouse Loss Support Group",
      "group_type": "SPOUSE_LOSS",
      "group_status": "ACTIVE",
      "meeting_frequency": "WEEKLY",
      "meeting_day": "TUESDAY",
      "meeting_time": "18:00",
      "duration_minutes": 90,
      "max_participants": 15,
      "current_participants": 8,
      "is_virtual": false,
      "is_open_enrollment": true
    }
  ]
}
```

---

#### Create Support Group

```http
POST /api/bereavement/support-groups
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "group_name": "Spouse Loss Support Group",
  "group_type": "SPOUSE_LOSS",
  "description": "Support group for individuals who have lost a spouse",
  "facilitator_id": "user_456",
  "meeting_frequency": "WEEKLY",
  "meeting_day": "TUESDAY",
  "meeting_time": "18:00",
  "duration_minutes": 90,
  "meeting_location": "Hospice Conference Room A",
  "max_participants": 15,
  "is_virtual": false,
  "start_date": "2024-02-01",
  "number_of_sessions": 8
}
```

---

#### Get Support Group Sessions

```http
GET /api/bereavement/support-groups/:id/sessions
```

**Permission:** `VIEW_CLINICAL_NOTES`

**Response:**
```json
{
  "status": 200,
  "data": [
    {
      "id": 1,
      "support_group_id": 1,
      "session_number": 1,
      "session_date": "2024-02-06",
      "session_topic": "Understanding Grief",
      "attendee_count": 8,
      "session_status": "COMPLETED",
      "session_notes": "Good participation, participants shared openly"
    }
  ]
}
```

---

#### Create Support Group Session

```http
POST /api/bereavement/support-groups/:id/sessions
```

**Permission:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "session_number": 1,
  "session_date": "2024-02-06",
  "session_time": "18:00",
  "duration_minutes": 90,
  "session_topic": "Understanding Grief",
  "session_description": "Introduction to stages of grief and normal grief reactions",
  "facilitator_id": "user_456"
}
```

---

## Data Models

### Claim Model

```typescript
{
  id: number;
  patient_id: number;
  payer_id: number;
  claim_number: string;
  claim_type: "INSTITUTIONAL" | "PROFESSIONAL";
  claim_status: "DRAFT" | "PENDING" | "SUBMITTED" | "PAID" | "DENIED" | "APPEALED";
  service_start_date: string; // ISO date
  service_end_date: string; // ISO date
  total_charges: number; // in cents
  total_paid: number; // in cents
  submission_date?: string; // ISO date
  paid_date?: string; // ISO date
  denial_reason?: string;
  created_by_id: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}
```

---

### Staff Profile Model

```typescript
{
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  job_title: string;
  employment_status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  hire_date: string; // ISO date
  termination_date?: string; // ISO date
  phone: string;
  mobile?: string;
  email: string;
  license_number?: string;
  license_state?: string;
  max_patient_load?: number;
  createdAt: string;
  updatedAt: string;
}
```

---

### Scheduled Visit Model

```typescript
{
  id: number;
  patient_id: number;
  staff_id: number;
  visit_type: "SKILLED_NURSING" | "AIDE" | "SOCIAL_WORK" | "CHAPLAIN" | "VOLUNTEER";
  visit_status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  scheduled_date: string; // ISO date
  scheduled_start_time: string; // HH:mm:ss
  scheduled_end_time: string; // HH:mm:ss
  actual_check_in_time?: string; // ISO datetime
  actual_check_out_time?: string; // ISO datetime
  actual_duration_minutes?: number;
  check_in_location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  check_out_location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  visit_purpose?: string;
  patient_confirmed?: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### Bereavement Case Model

```typescript
{
  id: number;
  patient_id: number;
  date_of_death: string; // ISO date
  bereavement_start_date: string; // ISO date
  bereavement_end_date: string; // ISO date (13 months after death)
  case_status: "ACTIVE" | "COMPLETED" | "CLOSED_EARLY";
  service_level: "STANDARD" | "ENHANCED" | "HIGH_RISK";
  assigned_counselor_id?: string;
  services_offered: boolean;
  services_declined: boolean;
  decline_reason?: string;
  initial_assessment_notes?: string;
  cultural_preferences?: string;
  closure_date?: string;
  closure_reason?: string;
  created_by_id: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Code Examples

### JavaScript/Fetch

#### Get All Claims

```javascript
const response = await fetch('http://localhost:3000/api/claims?claim_status=PENDING', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

---

#### Create Bereavement Case

```javascript
const response = await fetch('http://localhost:3000/api/bereavement/cases', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    patient_id: 123,
    date_of_death: '2024-01-01',
    service_level: 'STANDARD',
    services_offered: true
  })
});

const data = await response.json();
console.log(data);
```

---

#### GPS Check-In to Visit

```javascript
// Get current GPS position
navigator.geolocation.getCurrentPosition(async (position) => {
  const response = await fetch('http://localhost:3000/api/visits/1/checkin', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN_HERE',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    })
  });

  const data = await response.json();
  console.log(data);
});
```

---

### Python/Requests

#### Get Expiring Credentials

```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
}

response = requests.get(
    'http://localhost:3000/api/staff/credentials/expiring?days=90',
    headers=headers
)

data = response.json()
print(data)
```

---

#### Create Risk Assessment with Auto-Scoring

```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
}

payload = {
    'bereavement_contact_id': 1,
    'assessment_date': '2024-01-15',
    'sudden_death': True,
    'traumatic_death': True,
    'limited_social_support': True,
    'history_of_mental_illness': True,
    'depression_symptoms': True,
    'anxiety_symptoms': True
}

response = requests.post(
    'http://localhost:3000/api/bereavement/cases/1/risk-assessments',
    headers=headers,
    json=payload
)

data = response.json()
# System automatically calculates risk_level = "MODERATE" (6 risk factors)
print(f"Risk Level: {data['data']['risk_level']}")
print(f"Risk Score: {data['data']['total_risk_score']}")
```

---

### cURL

#### Get Overdue RN Visits

```bash
curl -X GET \
  'http://localhost:3000/api/compliance/visits/rn-overdue' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

---

#### Submit Claim

```bash
curl -X POST \
  'http://localhost:3000/api/claims/1/submit' \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json'
```

---

## Rate Limiting

Currently, there are no rate limits enforced. However, best practices recommend:
- Maximum 100 requests per minute per user
- Use pagination for large datasets
- Implement caching where appropriate

---

## Versioning

This API uses URL versioning. The current version is `v1`.

Future versions will be available at:
- `http://localhost:3000/api/v2/...`

Breaking changes will only be introduced in major version updates.

---

## Support

For API support, please contact:
- **Documentation:** See IMPLEMENTATION_GUIDE.md
- **Issues:** Submit via GitHub issues
- **Email:** support@hospice-ehr.org

---

**Last Updated:** 2024-12-27
**API Version:** 1.0.0
**Documentation Version:** 1.0.0
