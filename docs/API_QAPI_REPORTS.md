# Hospice EHR API Documentation
## QAPI & Reports Modules

**Version:** 1.0
**Last Updated:** 2024-12-27
**Base URL:** `http://localhost:8000/api`

---

## Table of Contents

### QAPI Module (24 endpoints)
1. [Incidents Management](#incidents-management) (6 endpoints)
2. [Grievances Management](#grievances-management) (6 endpoints)
3. [Quality Measures](#quality-measures) (4 endpoints)
4. [Performance Improvement Projects](#performance-improvement-projects) (3 endpoints)
5. [Chart Audits](#chart-audits) (2 endpoints)
6. [Infection Control](#infection-control) (3 endpoints)

### Reports Module (21 endpoints)
7. [Census Reports](#census-reports) (4 endpoints)
8. [Clinical Compliance Reports](#clinical-compliance-reports) (4 endpoints)
9. [Billing Reports](#billing-reports) (4 endpoints)
10. [QAPI Reports](#qapi-reports) (4 endpoints)
11. [Staff Reports](#staff-reports) (3 endpoints)
12. [Bereavement Reports](#bereavement-reports) (1 endpoint)
13. [Executive Dashboard](#executive-dashboard) (1 endpoint)

---

## Authentication

All endpoints require Bearer token authentication:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

# QAPI Module

Quality Assurance and Performance Improvement endpoints for tracking incidents, grievances, quality measures, PIPs, audits, and infection control.

---

## Incidents Management

### 1. List All Incidents

**GET** `/incidents`

Retrieve all incidents with optional filtering.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `patient_id` (optional) - Filter by patient ID
- `incident_type` (optional) - Filter by incident type
- `severity` (optional) - HIGH, MODERATE, LOW
- `status` (optional) - OPEN, UNDER_INVESTIGATION, CLOSED
- `from_date` (optional) - Start date (YYYY-MM-DD)
- `to_date` (optional) - End date (YYYY-MM-DD)

**Example Request:**
```bash
curl http://localhost:8000/api/incidents?severity=HIGH&status=OPEN \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Incidents retrieved successfully",
  "data": [
    {
      "id": 1,
      "patient_id": 123,
      "incident_date": "2024-12-27",
      "incident_type": "MEDICATION_ERROR",
      "severity": "HIGH",
      "description": "Wrong medication administered",
      "location": "Patient home",
      "immediate_actions_taken": "Contacted physician, monitored patient vitals",
      "status": "UNDER_INVESTIGATION",
      "reported_by_id": "user-abc",
      "created_by_id": "user-abc",
      "createdAt": "2024-12-27T10:00:00Z",
      "updatedAt": "2024-12-27T10:00:00Z"
    }
  ]
}
```

---

### 2. Get Incident by ID

**GET** `/incidents/:id`

Retrieve a specific incident by ID.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Request:**
```bash
curl http://localhost:8000/api/incidents/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Create Incident

**POST** `/incidents`

Create a new incident report.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "incident_date": "2024-12-27",
  "incident_time": "14:30:00",
  "incident_type": "MEDICATION_ERROR",
  "severity": "MODERATE",
  "description": "Patient received incorrect dose of pain medication",
  "location": "Patient home",
  "witnesses": "Family member present",
  "immediate_actions_taken": "Contacted physician, assessed patient condition",
  "reported_by_id": "user-123",
  "reported_by_name": "Jane Doe, RN",
  "status": "OPEN"
}
```

**Example Response:**
```json
{
  "status": 201,
  "message": "Incident created successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "incident_date": "2024-12-27",
    "status": "OPEN",
    "created_by_id": "user-abc",
    "createdAt": "2024-12-27T14:45:00Z"
  }
}
```

---

### 4. Update Incident

**PUT** `/incidents/:id`

Update incident details, investigation findings, or corrective actions.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "status": "UNDER_INVESTIGATION",
  "investigation_findings": "Root cause identified as mislabeled medication container",
  "root_cause_analysis": "Pharmacy dispensing error, staff did not verify label against MAR",
  "corrective_actions": "Re-training on medication verification protocol, pharmacy notified"
}
```

---

### 5. Close Incident

**POST** `/incidents/:id/close`

Close an incident with resolution notes.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "resolution_notes": "Incident fully investigated. Staff re-trained. Pharmacy updated labeling procedures.",
  "corrective_actions": "Implemented double-check protocol for all medication administration"
}
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Incident closed successfully",
  "data": {
    "id": 1,
    "status": "CLOSED",
    "closed_date": "2024-12-28T10:00:00Z",
    "resolution_notes": "Incident fully investigated...",
    "updatedAt": "2024-12-28T10:00:00Z"
  }
}
```

---

### 6. Delete Incident

**DELETE** `/incidents/:id`

Soft delete an incident (sets deleted_at timestamp).

**Permissions Required:** `DELETE_CLINICAL_NOTES`

---

## Grievances Management

### 1. List All Grievances

**GET** `/grievances`

Retrieve all grievances with optional filtering.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `patient_id` (optional) - Filter by patient ID
- `grievance_type` (optional) - CARE_QUALITY, STAFF_BEHAVIOR, ACCESS_TO_CARE, etc.
- `priority` (optional) - LOW, MEDIUM, HIGH, URGENT
- `status` (optional) - OPEN, UNDER_INVESTIGATION, RESOLVED
- `from_date` (optional) - Start date (YYYY-MM-DD)
- `to_date` (optional) - End date (YYYY-MM-DD)

**Example Request:**
```bash
curl http://localhost:8000/api/grievances?priority=HIGH&status=OPEN \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Grievances retrieved successfully",
  "data": [
    {
      "id": 1,
      "patient_id": 123,
      "grievance_type": "CARE_QUALITY",
      "priority": "HIGH",
      "description": "Family concerned about delayed response to pain complaints",
      "received_date": "2024-12-27",
      "complainant_name": "John Smith",
      "complainant_relationship": "Son",
      "status": "UNDER_INVESTIGATION",
      "created_by_id": "user-abc",
      "createdAt": "2024-12-27T09:00:00Z"
    }
  ]
}
```

---

### 2. Get Grievance by ID

**GET** `/grievances/:id`

Retrieve a specific grievance by ID.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

---

### 3. Create Grievance

**POST** `/grievances`

Create a new grievance.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "grievance_type": "STAFF_BEHAVIOR",
  "priority": "MEDIUM",
  "description": "Family reports staff member was dismissive of concerns",
  "received_date": "2024-12-27",
  "complainant_name": "Jane Smith",
  "complainant_relationship": "Daughter",
  "complainant_contact": "555-1234",
  "preferred_contact_method": "Phone",
  "status": "OPEN"
}
```

---

### 4. Update Grievance

**PUT** `/grievances/:id`

Update grievance investigation details.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "status": "UNDER_INVESTIGATION",
  "investigation_notes": "Interviewed staff member and family. Reviewing documentation.",
  "assigned_to_id": "user-789",
  "investigation_start_date": "2024-12-28"
}
```

---

### 5. Resolve Grievance

**POST** `/grievances/:id/resolve`

Mark a grievance as resolved.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "resolution": "Staff member counseled on communication techniques. Family satisfied with response.",
  "resolution_notes": "Implemented additional staff training on empathetic communication. Family contacted and thanked for bringing issue to attention."
}
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Grievance resolved successfully",
  "data": {
    "id": 1,
    "status": "RESOLVED",
    "resolution_date": "2024-12-29T15:00:00Z",
    "resolution": "Staff member counseled...",
    "updatedAt": "2024-12-29T15:00:00Z"
  }
}
```

---

### 6. Delete Grievance

**DELETE** `/grievances/:id`

Soft delete a grievance.

**Permissions Required:** `DELETE_CLINICAL_NOTES`

---

## Quality Measures

### 1. List All Quality Measures

**GET** `/quality-measures`

Retrieve all quality measure definitions.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `category` (optional) - PAIN_MANAGEMENT, SYMPTOM_MANAGEMENT, etc.
- `status` (optional) - ACTIVE, INACTIVE
- `cms_required` (optional) - true/false

**Example Response:**
```json
{
  "status": 200,
  "message": "Quality measures retrieved successfully",
  "data": [
    {
      "id": 1,
      "measure_name": "Pain Assessment within 24 Hours",
      "category": "PAIN_MANAGEMENT",
      "description": "Percentage of patients with pain assessment within 24 hours of admission",
      "target_value": 95.0,
      "cms_required": true,
      "measurement_frequency": "MONTHLY",
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 2. Create Quality Measure

**POST** `/quality-measures`

Define a new quality measure.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "measure_name": "Timely IDG Meetings",
  "category": "CARE_COORDINATION",
  "description": "Percentage of patients discussed in IDG within 14 days of admission",
  "target_value": 100.0,
  "cms_required": true,
  "measurement_frequency": "MONTHLY",
  "numerator_definition": "Patients discussed in IDG within 14 days",
  "denominator_definition": "All admitted patients",
  "status": "ACTIVE"
}
```

---

### 3. Record Measure Data

**POST** `/quality-measures/data`

Record a data point for a quality measure.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "quality_measure_id": 1,
  "measurement_date": "2024-12-31",
  "actual_value": 97.5,
  "target_value": 95.0,
  "numerator": 39,
  "denominator": 40,
  "data_source": "EHR Chart Review",
  "notes": "One patient admitted late in month, assessment completed on day 2"
}
```

**Example Response:**
```json
{
  "status": 201,
  "message": "Quality measure data recorded successfully",
  "data": {
    "id": 1,
    "quality_measure_id": 1,
    "measurement_date": "2024-12-31",
    "actual_value": 97.5,
    "target_value": 95.0,
    "variance": 2.5,
    "numerator": 39,
    "denominator": 40,
    "created_by_id": "user-abc",
    "createdAt": "2024-12-31T10:00:00Z"
  }
}
```

**Note:** Variance is automatically calculated as `actual_value - target_value`.

---

### 4. Get Measure Trends

**GET** `/quality-measures/trends`

Get historical data points for a quality measure.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `measure_id` (required) - Quality measure ID
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Request:**
```bash
curl "http://localhost:8000/api/quality-measures/trends?measure_id=1&from_date=2024-01-01&to_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Measure trends retrieved successfully",
  "data": [
    {
      "id": 1,
      "measurement_date": "2024-01-31",
      "actual_value": 94.2,
      "target_value": 95.0,
      "variance": -0.8
    },
    {
      "id": 2,
      "measurement_date": "2024-02-29",
      "actual_value": 96.8,
      "target_value": 95.0,
      "variance": 1.8
    }
  ]
}
```

---

## Performance Improvement Projects

### 1. List All PIPs

**GET** `/pips`

Retrieve all performance improvement projects.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `status` (optional) - PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
- `priority` (optional) - LOW, MEDIUM, HIGH

**Example Response:**
```json
{
  "status": 200,
  "message": "PIPs retrieved successfully",
  "data": [
    {
      "id": 1,
      "project_name": "Improve Pain Assessment Timeliness",
      "problem_statement": "15% of patients not receiving pain assessment within 24-hour window",
      "aim_statement": "Increase compliance to 95% within 90 days",
      "priority": "HIGH",
      "start_date": "2024-12-01",
      "target_completion_date": "2025-03-01",
      "status": "IN_PROGRESS",
      "createdAt": "2024-11-28T00:00:00Z"
    }
  ]
}
```

---

### 2. Create PIP

**POST** `/pips`

Create a new performance improvement project.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "project_name": "Reduce Medication Errors",
  "problem_statement": "Medication error rate is 2.1% vs industry benchmark of <1%",
  "aim_statement": "Reduce medication errors to <1% within 6 months through double-check protocol",
  "priority": "HIGH",
  "start_date": "2025-01-15",
  "target_completion_date": "2025-07-15",
  "team_members": ["user-123", "user-456", "user-789"],
  "pdsa_cycles": [
    {
      "cycle": 1,
      "plan": "Implement double-check for all controlled substances",
      "do": "TBD",
      "study": "TBD",
      "act": "TBD"
    }
  ],
  "status": "PLANNING"
}
```

---

### 3. Update PIP

**PUT** `/pips/:id`

Update PIP status, progress, or PDSA cycles.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "pdsa_cycles": [
    {
      "cycle": 1,
      "plan": "Implement double-check for all controlled substances",
      "do": "Rolled out to 50% of staff on Week 1",
      "study": "Error rate decreased from 2.1% to 1.5% in Week 1",
      "act": "Expand to 100% of staff in Week 2"
    }
  ],
  "progress_notes": "Initial results promising, continuing rollout"
}
```

---

## Chart Audits

### 1. Conduct Chart Audit

**POST** `/chart-audits`

Document a completed chart audit.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "audit_date": "2024-12-27",
  "auditor_id": "user-789",
  "audit_type": "COMPREHENSIVE",
  "documentation_complete": true,
  "signatures_present": true,
  "orders_current": true,
  "medications_reconciled": true,
  "compliance_score": 95,
  "findings": "All required documentation present. Minor issue: one visit note missing time stamp.",
  "recommendations": "Remind staff to include timestamps on all visit notes.",
  "follow_up_required": false
}
```

**Example Response:**
```json
{
  "status": 201,
  "message": "Chart audit recorded successfully",
  "data": {
    "id": 1,
    "patient_id": 123,
    "audit_date": "2024-12-27",
    "compliance_score": 95,
    "created_by_id": "user-abc",
    "createdAt": "2024-12-27T16:00:00Z"
  }
}
```

---

### 2. Get Audit Results

**GET** `/chart-audits`

Retrieve chart audit results with filtering.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `patient_id` (optional) - Filter by patient
- `auditor_id` (optional) - Filter by auditor
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Audit results retrieved successfully",
  "data": [
    {
      "id": 1,
      "patient_id": 123,
      "audit_date": "2024-12-27",
      "auditor_id": "user-789",
      "audit_type": "COMPREHENSIVE",
      "compliance_score": 95,
      "findings": "All required documentation present...",
      "createdAt": "2024-12-27T16:00:00Z"
    }
  ]
}
```

---

## Infection Control

### 1. List All Infections

**GET** `/infections`

Retrieve all infection reports.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `patient_id` (optional) - Filter by patient
- `infection_type` (optional) - UTI, PNEUMONIA, WOUND_INFECTION, etc.
- `source` (optional) - COMMUNITY_ACQUIRED, HEALTHCARE_ASSOCIATED
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Infection reports retrieved successfully",
  "data": [
    {
      "id": 1,
      "patient_id": 123,
      "infection_type": "UTI",
      "source": "HEALTHCARE_ASSOCIATED",
      "onset_date": "2024-12-25",
      "symptoms": "Fever, dysuria, cloudy urine",
      "culture_results": "E. coli >100,000 CFU/mL",
      "intervention_taken": "Antibiotic therapy per MD order",
      "reported_to_physician": true,
      "createdAt": "2024-12-25T14:00:00Z"
    }
  ]
}
```

---

### 2. Report Infection

**POST** `/infections`

Report a new infection.

**Permissions Required:** `CREATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "patient_id": 123,
  "infection_type": "WOUND_INFECTION",
  "source": "HEALTHCARE_ASSOCIATED",
  "onset_date": "2024-12-27",
  "location_of_infection": "Surgical site - right hip",
  "symptoms": "Redness, swelling, purulent drainage from incision site",
  "culture_results": "Pending",
  "intervention_taken": "Wound cultured, contacted MD, topical antimicrobial applied",
  "reported_to_physician": true,
  "reported_to_health_dept": false,
  "isolation_precautions": "Standard precautions",
  "notes": "Patient had hip replacement 2 weeks ago at acute care hospital"
}
```

---

### 3. Update Infection Report

**PUT** `/infections/:id`

Update infection report with culture results or outcome.

**Permissions Required:** `UPDATE_CLINICAL_NOTES`

**Request Body:**
```json
{
  "culture_results": "MRSA positive",
  "intervention_taken": "MD ordered IV vancomycin, wound care daily",
  "outcome": "Resolved after 14 days of treatment",
  "resolution_date": "2025-01-10"
}
```

---

# Reports Module

Analytics and reporting endpoints that query existing data across all modules.

---

## Census Reports

### 1. Current Census

**GET** `/reports/census/current`

Get all currently active patients.

**Permissions Required:** `VIEW_PATIENT_DETAILS` or `VIEW_CLINICAL_NOTES`

**Query Parameters:**
- `level_of_care` (optional) - Filter by level of care

**Example Request:**
```bash
curl http://localhost:8000/api/reports/census/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Current census retrieved successfully",
  "data": {
    "patients": [
      {
        "patient_id": 123,
        "patient_name": "John Smith",
        "mrn": "MRN-12345",
        "admission_date": "2024-10-15",
        "primary_diagnosis": "End-stage COPD",
        "level_of_care": "ROUTINE",
        "attending_physician": "Dr. Jane Doe"
      }
    ],
    "summary": [
      {
        "total_patients": 35,
        "level_of_care": "ROUTINE"
      },
      {
        "total_patients": 8,
        "level_of_care": "CONTINUOUS_CARE"
      },
      {
        "total_patients": 2,
        "level_of_care": "INPATIENT"
      }
    ],
    "total_count": 45,
    "as_of_date": "2024-12-27T10:00:00Z"
  }
}
```

---

### 2. Census by Level of Care

**GET** `/reports/census/by-level-of-care`

Aggregate patient counts and average LOS by level of care.

**Permissions Required:** `VIEW_PATIENT_DETAILS` or `VIEW_CLINICAL_NOTES`

**Example Response:**
```json
{
  "status": 200,
  "message": "Census by level of care retrieved successfully",
  "data": [
    {
      "level_of_care": "ROUTINE",
      "patient_count": 35,
      "avg_length_of_stay": 42.5
    },
    {
      "level_of_care": "CONTINUOUS_CARE",
      "patient_count": 8,
      "avg_length_of_stay": 3.2
    },
    {
      "level_of_care": "INPATIENT",
      "patient_count": 2,
      "avg_length_of_stay": 5.0
    }
  ]
}
```

---

### 3. Admissions and Discharges

**GET** `/reports/census/admissions-discharges`

Get admissions and discharges for a date range.

**Permissions Required:** `VIEW_PATIENT_DETAILS` or `VIEW_CLINICAL_NOTES`

**Query Parameters (Required):**
- `from_date` - Start date (YYYY-MM-DD)
- `to_date` - End date (YYYY-MM-DD)

**Example Request:**
```bash
curl "http://localhost:8000/api/reports/census/admissions-discharges?from_date=2024-12-01&to_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Admissions and discharges retrieved successfully",
  "data": {
    "admissions": [
      {
        "patient_id": 150,
        "patient_name": "Mary Johnson",
        "admission_date": "2024-12-05",
        "level_of_care": "ROUTINE"
      }
    ],
    "discharges": [
      {
        "patient_id": 145,
        "patient_name": "Robert Williams",
        "discharge_date": "2024-12-10",
        "discharge_reason": "DEATH"
      }
    ],
    "admission_count": 12,
    "discharge_count": 8,
    "from_date": "2024-12-01",
    "to_date": "2024-12-31"
  }
}
```

---

### 4. Average Length of Stay

**GET** `/reports/census/average-los`

Calculate average length of stay by level of care.

**Permissions Required:** `VIEW_PATIENT_DETAILS` or `VIEW_CLINICAL_NOTES`

**Example Response:**
```json
{
  "status": 200,
  "message": "Average length of stay retrieved successfully",
  "data": [
    {
      "level_of_care": "ROUTINE",
      "avg_los_days": 45.3,
      "patient_count": 120
    },
    {
      "level_of_care": "CONTINUOUS_CARE",
      "avg_los_days": 3.8,
      "patient_count": 25
    }
  ]
}
```

---

## Clinical Compliance Reports

### 1. Recertifications Due

**GET** `/reports/compliance/recertifications-due`

Get patients with certifications ending soon.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `days_ahead` (optional, default: 30) - Look ahead window in days

**Example Request:**
```bash
curl "http://localhost:8000/api/reports/compliance/recertifications-due?days_ahead=30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "status": 200,
  "message": "Recertifications due retrieved successfully",
  "data": {
    "recertifications": [
      {
        "patient_id": 123,
        "patient_name": "John Smith",
        "certification_id": 45,
        "certification_period": "SUBSEQUENT_60",
        "end_date": "2025-01-15",
        "days_until_due": 19,
        "certification_status": "ACTIVE"
      }
    ],
    "count": 8,
    "days_ahead": 30
  }
}
```

---

### 2. Overdue Visits

**GET** `/reports/compliance/overdue-visits`

Get patients with overdue visit compliance.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Overdue visits retrieved successfully",
  "data": {
    "patients": [
      {
        "patient_id": 134,
        "patient_name": "Susan Brown",
        "last_visit_date": "2024-12-10",
        "days_since_visit": 17,
        "visit_frequency_required": "EVERY_14_DAYS",
        "compliance_status": "NON_COMPLIANT"
      }
    ],
    "count": 5
  }
}
```

---

### 3. IDG Meeting Compliance

**GET** `/reports/compliance/idg-meetings`

Analyze IDG meeting compliance.

**Permissions Required:** `VIEW_CLINICAL_NOTES`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "IDG meeting compliance retrieved successfully",
  "data": {
    "meetings": [
      {
        "meeting_date": "2024-12-20",
        "total_patients_discussed": 45,
        "meeting_duration_minutes": 90,
        "status": "COMPLETED"
      }
    ],
    "summary": {
      "total_meetings": 52,
      "avg_patients_per_meeting": 42.5,
      "avg_duration_minutes": 85.3
    },
    "from_date": null,
    "to_date": null
  }
}
```

---

### 4. Medication Reconciliation Status

**GET** `/reports/compliance/medication-reconciliation`

Get medication reconciliation status for active patients.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Medication reconciliation status retrieved successfully",
  "data": [
    {
      "patient_id": 123,
      "patient_name": "John Smith",
      "admission_date": "2024-10-15",
      "medication_count": 12
    }
  ]
}
```

---

## Billing Reports

### 1. Pending Claims

**GET** `/reports/billing/pending-claims`

Get all claims pending submission or payment.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Pending claims retrieved successfully",
  "data": {
    "claims": [
      {
        "claim_id": 567,
        "patient_id": 123,
        "patient_name": "John Smith",
        "claim_number": "CLM-2024-567",
        "claim_type": "INSTITUTIONAL",
        "claim_status": "READY_FOR_SUBMISSION",
        "service_start_date": "2024-12-01",
        "service_end_date": "2024-12-31",
        "total_charges": 8500,
        "days_pending": 5
      }
    ],
    "summary": {
      "total_claims": 15,
      "total_charges": 127500
    }
  }
}
```

---

### 2. AR Aging Summary

**GET** `/reports/billing/ar-aging-summary`

Get accounts receivable aging by bucket.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "AR aging summary retrieved successfully",
  "data": {
    "by_bucket": [
      {
        "aging_bucket": "0-30",
        "total_balance": 85000,
        "claim_count": 12
      },
      {
        "aging_bucket": "31-60",
        "total_balance": 42000,
        "claim_count": 7
      },
      {
        "aging_bucket": "61-90",
        "total_balance": 18000,
        "claim_count": 3
      },
      {
        "aging_bucket": "90+",
        "total_balance": 9500,
        "claim_count": 2
      }
    ],
    "totals": {
      "total_ar": 154500,
      "total_claims": 24
    },
    "as_of_date": "2024-12-27T10:00:00Z"
  }
}
```

---

### 3. Revenue by Payer

**GET** `/reports/billing/revenue-by-payer`

Get revenue breakdown by payer.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Revenue by payer retrieved successfully",
  "data": {
    "payers": [
      {
        "payer_id": 1,
        "total_charges": 450000,
        "total_paid": 420000,
        "claim_count": 45
      },
      {
        "payer_id": 2,
        "total_charges": 280000,
        "total_paid": 265000,
        "claim_count": 28
      }
    ],
    "from_date": null,
    "to_date": null
  }
}
```

---

### 4. Unbilled Periods

**GET** `/reports/billing/unbilled-periods`

Get billing periods that are complete but not yet billed.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Unbilled periods retrieved successfully",
  "data": {
    "periods": [
      {
        "patient_id": 123,
        "patient_name": "John Smith",
        "period_start": "2024-11-01",
        "period_end": "2024-11-30",
        "level_of_care": "ROUTINE",
        "days_unbilled": 27
      }
    ],
    "count": 8
  }
}
```

---

## QAPI Reports

### 1. Incidents Summary

**GET** `/reports/qapi/incidents-summary`

Get incident statistics by type and severity.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Incidents summary retrieved successfully",
  "data": {
    "by_type": [
      {
        "incident_type": "MEDICATION_ERROR",
        "count": 5,
        "high_severity": 1,
        "moderate_severity": 3,
        "low_severity": 1
      },
      {
        "incident_type": "FALL",
        "count": 3,
        "high_severity": 0,
        "moderate_severity": 2,
        "low_severity": 1
      }
    ],
    "by_status": [
      {
        "status": "OPEN",
        "count": 2
      },
      {
        "status": "UNDER_INVESTIGATION",
        "count": 3
      },
      {
        "status": "CLOSED",
        "count": 3
      }
    ],
    "from_date": null,
    "to_date": null
  }
}
```

---

### 2. Grievances Summary

**GET** `/reports/qapi/grievances-summary`

Get grievance statistics by type and status.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Grievances summary retrieved successfully",
  "data": {
    "by_type": [
      {
        "grievance_type": "CARE_QUALITY",
        "count": 4,
        "high_priority": 1
      },
      {
        "grievance_type": "STAFF_BEHAVIOR",
        "count": 2,
        "high_priority": 0
      }
    ],
    "by_status": [
      {
        "status": "OPEN",
        "count": 1
      },
      {
        "status": "RESOLVED",
        "count": 5
      }
    ],
    "from_date": null,
    "to_date": null
  }
}
```

---

### 3. Quality Measures Dashboard

**GET** `/reports/qapi/quality-measures-dashboard`

Get quality measure performance summary.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Quality measures dashboard retrieved successfully",
  "data": {
    "measures": [
      {
        "quality_measure_id": 1,
        "avg_actual_value": 96.2,
        "avg_target_value": 95.0,
        "avg_variance": 1.2,
        "measurement_count": 12
      }
    ],
    "from_date": null,
    "to_date": null
  }
}
```

---

### 4. Chart Audit Scores

**GET** `/reports/qapi/chart-audit-scores`

Get chart audit compliance statistics.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Chart audit scores retrieved successfully",
  "data": {
    "summary": {
      "avg_compliance_score": 94.5,
      "total_audits": 48,
      "documentation_complete_rate": 97.92,
      "signatures_present_rate": 95.83,
      "orders_current_rate": 100.00
    },
    "by_auditor": [
      {
        "auditor_id": "user-789",
        "avg_compliance_score": 95.2,
        "audit_count": 25
      },
      {
        "auditor_id": "user-456",
        "avg_compliance_score": 93.8,
        "audit_count": 23
      }
    ],
    "from_date": null,
    "to_date": null
  }
}
```

---

## Staff Reports

### 1. Staff Productivity

**GET** `/reports/staff/productivity`

Get staff productivity by caseload.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `from_date` (optional) - Start date
- `to_date` (optional) - End date

**Example Response:**
```json
{
  "status": 200,
  "message": "Staff productivity retrieved successfully",
  "data": [
    {
      "staff_id": 1,
      "staff_name": "Jane Doe",
      "role": "RN_CASE_MANAGER",
      "caseload_count": 15
    },
    {
      "staff_id": 2,
      "staff_name": "John Smith",
      "role": "RN_CASE_MANAGER",
      "caseload_count": 12
    }
  ]
}
```

---

### 2. Credential Expirations

**GET** `/reports/staff/credential-expirations`

Get credentials expiring soon.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Query Parameters:**
- `days_ahead` (optional, default: 90) - Look ahead window

**Example Response:**
```json
{
  "status": 200,
  "message": "Credential expirations retrieved successfully",
  "data": {
    "credentials": [
      {
        "staff_id": 1,
        "staff_name": "Jane Doe",
        "credential_type": "RN_LICENSE",
        "credential_number": "RN-12345",
        "expiration_date": "2025-02-28",
        "days_until_expiration": 63
      }
    ],
    "count": 5,
    "days_ahead": 90
  }
}
```

---

### 3. Caseload Summary

**GET** `/reports/staff/caseload-summary`

Get active patient counts by staff member.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Caseload summary retrieved successfully",
  "data": [
    {
      "staff_id": 1,
      "staff_name": "Jane Doe",
      "role": "RN_CASE_MANAGER",
      "active_patients": 15
    },
    {
      "staff_id": 2,
      "staff_name": "John Smith",
      "role": "RN_CASE_MANAGER",
      "active_patients": 12
    }
  ]
}
```

---

## Bereavement Reports

### 1. Active Bereavement Cases

**GET** `/reports/bereavement/active-cases`

Get all active bereavement cases.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Active bereavement cases retrieved successfully",
  "data": {
    "cases": [
      {
        "case_id": 1,
        "patient_id": 145,
        "patient_name": "Robert Williams",
        "date_of_death": "2024-11-15",
        "bereavement_end_date": "2025-12-15",
        "days_remaining": 354,
        "case_status": "ACTIVE",
        "service_level": "STANDARD"
      }
    ],
    "count": 12
  }
}
```

---

## Executive Dashboard

### 1. Executive Dashboard Summary

**GET** `/reports/executive/dashboard`

Get high-level KPIs for executive overview.

**Permissions Required:** `VIEW_CLINICAL_NOTES` or `VIEW_PATIENT_DETAILS`

**Example Response:**
```json
{
  "status": 200,
  "message": "Executive dashboard retrieved successfully",
  "data": {
    "current_census": 45,
    "pending_claims": 15,
    "pending_claims_value": 127500,
    "active_incidents": 3,
    "active_grievances": 2,
    "recertifications_due_30_days": 8,
    "as_of_date": "2024-12-27T10:00:00Z"
  }
}
```

---

## Code Examples

### JavaScript (fetch)

```javascript
// Get current census
async function getCurrentCensus() {
  const response = await fetch('http://localhost:8000/api/reports/census/current', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('Current Census:', data);
  return data;
}

// Create incident
async function createIncident(incidentData) {
  const response = await fetch('http://localhost:8000/api/incidents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(incidentData)
  });

  const data = await response.json();
  return data;
}

// Record quality measure data
async function recordQualityData(measureData) {
  const response = await fetch('http://localhost:8000/api/quality-measures/data', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(measureData)
  });

  return await response.json();
}
```

### Python (requests)

```python
import requests

BASE_URL = 'http://localhost:8000/api'
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Get pending claims
def get_pending_claims():
    response = requests.get(
        f'{BASE_URL}/reports/billing/pending-claims',
        headers=headers
    )
    return response.json()

# Create grievance
def create_grievance(grievance_data):
    response = requests.post(
        f'{BASE_URL}/grievances',
        headers=headers,
        json=grievance_data
    )
    return response.json()

# Get executive dashboard
def get_executive_dashboard():
    response = requests.get(
        f'{BASE_URL}/reports/executive/dashboard',
        headers=headers
    )
    return response.json()
```

### cURL

```bash
# Get AR aging summary
curl http://localhost:8000/api/reports/billing/ar-aging-summary \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create PIP
curl -X POST http://localhost:8000/api/pips \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Improve Pain Assessment Timeliness",
    "problem_statement": "15% of patients not receiving assessment within 24 hours",
    "aim_statement": "Increase compliance to 95% within 90 days",
    "priority": "HIGH",
    "start_date": "2025-01-15",
    "status": "PLANNING"
  }'

# Get quality measures trends
curl "http://localhost:8000/api/quality-measures/trends?measure_id=1&from_date=2024-01-01&to_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## TypeScript Data Models

```typescript
// QAPI Models
interface Incident {
  id: number;
  patient_id: number;
  incident_date: string;
  incident_time?: string;
  incident_type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH';
  description: string;
  location: string;
  witnesses?: string;
  immediate_actions_taken?: string;
  reported_by_id: string;
  reported_by_name: string;
  investigation_findings?: string;
  root_cause_analysis?: string;
  corrective_actions?: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'CLOSED';
  closed_date?: string;
  resolution_notes?: string;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

interface Grievance {
  id: number;
  patient_id: number;
  grievance_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  received_date: string;
  complainant_name: string;
  complainant_relationship: string;
  complainant_contact?: string;
  preferred_contact_method?: string;
  investigation_notes?: string;
  assigned_to_id?: string;
  investigation_start_date?: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED';
  resolution?: string;
  resolution_notes?: string;
  resolution_date?: string;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

interface QualityMeasure {
  id: number;
  measure_name: string;
  category: string;
  description?: string;
  target_value: number;
  cms_required: boolean;
  measurement_frequency: string;
  numerator_definition?: string;
  denominator_definition?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

interface QualityMeasureData {
  id: number;
  quality_measure_id: number;
  measurement_date: string;
  actual_value: number;
  target_value: number;
  variance: number;
  numerator?: number;
  denominator?: number;
  data_source?: string;
  notes?: string;
  created_by_id?: string;
  deleted_at?: string;
  createdAt: string;
}

interface PerformanceImprovementProject {
  id: number;
  project_name: string;
  problem_statement: string;
  aim_statement: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  start_date: string;
  target_completion_date: string;
  actual_completion_date?: string;
  team_members?: string[];
  pdsa_cycles?: any[];
  status: 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  progress_notes?: string;
  outcomes?: string;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt: string;
  updatedAt: string;
}

// Report Models
interface CensusReport {
  patients: Patient[];
  summary: {
    total_patients: number;
    level_of_care: string;
  }[];
  total_count: number;
  as_of_date: string;
}

interface ExecutiveDashboard {
  current_census: number;
  pending_claims: number;
  pending_claims_value: number;
  active_incidents: number;
  active_grievances: number;
  recertifications_due_30_days: number;
  as_of_date: string;
}
```

---

## Summary

### QAPI Module
- **24 endpoints** for quality assurance and performance improvement
- Comprehensive incident and grievance tracking
- Quality measure definitions and data collection
- Performance improvement project management
- Chart audit documentation
- Infection control surveillance

### Reports Module
- **21 endpoints** for analytics and reporting
- Real-time data aggregation from all modules
- Census, compliance, billing, QAPI, staff, and bereavement reports
- Executive dashboard with key performance indicators
- All reports support date range filtering
- No additional database tables required

**Total Documentation:** 45 endpoints fully documented with request/response examples and code samples.

---

**For additional API documentation, see:**
- `API_CERTIFICATIONS_MEDICATIONS.md` - Certifications & Medications API
- `API_CLINICAL_MODULES.md` - HOPE, Encounters, Care Planning, IDG API
- `API_ADVANCED_MODULES.md` - Billing, Staff, Scheduling, Bereavement API
