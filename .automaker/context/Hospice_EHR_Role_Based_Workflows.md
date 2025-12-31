# Hospice EHR Role-Based Workflows

## Engrace Hospice | Portland, Oregon
**Version 1.0 | January 2025**

---

## Table of Contents

1. [Super Administrator](#1-super-administrator)
2. [Administrator](#2-administrator)
3. [Registered Nurse (RN)](#3-registered-nurse-rn)
4. [Physician / Medical Director (MD)](#4-physician--medical-director-md)
5. [Hospice Aide / CNA](#5-hospice-aide--cna)
6. [Medical Social Worker (MSW)](#6-medical-social-worker-msw)
7. [Chaplain / Spiritual Care](#7-chaplain--spiritual-care)
8. [Physical / Occupational / Speech Therapist](#8-physical--occupational--speech-therapist)
9. [Management / Supervisory Staff](#9-management--supervisory-staff)
10. [Billing Staff](#10-billing-staff)
11. [Surveyor / Auditor](#11-surveyor--auditor-read-only)
12. [Volunteer / Volunteer Coordinator](#12-volunteer--volunteer-coordinator)
13. [Licensed Practical Nurse (LPN)](#13-licensed-practical-nurse-lpn)
14. [Nurse Practitioner (NP)](#14-nurse-practitioner-np)
15. [Bereavement Coordinator](#15-bereavement-coordinator)
16. [Executive Director](#16-executive-director)
17. [Clinical Director / Manager](#17-clinical-director--manager)
18. [Medical Records Coordinator](#18-medical-records-coordinator)
19. [Dietitian / Nutritionist](#19-dietitian--nutritionist)
20. [Massage / Music Therapist](#20-massage--music-therapist)

---

## Access Level Legend

| Level | Description |
|-------|-------------|
| **FULL ACCESS** | Create, read, update, delete functionality |
| **LIMITED** | Read and update own records only |
| **RESTRICTED** | No access or read-only |

---

## 1. Super Administrator

**Role Description:** System-level administrator with full access to all modules, user management, and system configuration. Typically IT or executive leadership.

### Dashboard View
- System Health Monitor (uptime, errors, performance)
- User Activity Logs
- Pending User Approvals
- HQRP Compliance Dashboard
- Census Summary (all locations)
- Billing/Revenue Summary

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| User Management | FULL | Create/edit/deactivate users, assign roles, reset passwords |
| System Configuration | FULL | Agency settings, locations, service areas, integrations |
| Security Settings | FULL | Password policies, session timeouts, 2FA, audit retention |
| Role/Permission Matrix | FULL | Define custom roles, modify access levels |
| All Clinical Modules | FULL | View/edit any patient record (for support) |
| All Billing Modules | FULL | View/edit claims, payment posting, AR management |
| Reports & Analytics | FULL | All reports, custom builder, data exports |
| Audit Logs | FULL | View all system activity, PHI access logs |
| HQRP/iQIES | FULL | HOPE submission management, quality dashboards |

### Typical Workflow
1. Login → System Dashboard
2. Review system alerts and pending approvals
3. Process new user requests (Settings → Users → Pending)
4. Review audit logs for compliance (Settings → Audit Logs)
5. Monitor HQRP submission status (Reports → HQRP Dashboard)
6. Generate compliance reports as needed

---

## 2. Administrator

**Role Description:** Agency administrator responsible for day-to-day operations, staff management, compliance oversight, and quality assurance. Does not have system configuration access.

### Dashboard View
- Daily Census & Admissions/Discharges
- Staff Productivity Metrics
- Compliance Alerts (overdue assessments, certifications)
- Quality Measure Performance
- Incident/Grievance Summary
- Upcoming IDG Meetings

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Staff Management | FULL | View staff schedules, caseloads, productivity |
| Patient Census | FULL | View all patients, admission/discharge reports |
| Referral Management | FULL | Assign referrals, track conversion rates |
| Clinical Records | READ | View patient charts for oversight (cannot edit) |
| IDG Management | FULL | Schedule IDG meetings, review agendas |
| Incident Reporting | FULL | Review/investigate incidents, track corrections |
| Grievances | FULL | Manage grievance workflow, resolution tracking |
| Quality Assurance | FULL | Chart audits, QAPI meetings, PIPs |
| Reports | FULL | Operational, clinical, and compliance reports |
| Billing | READ | View billing summaries (cannot edit claims) |
| System Configuration | NONE | No access to system settings |

### Typical Daily Workflow
1. Login → Review Dashboard alerts
2. Check overdue items (Compliance → Overdue Dashboard)
3. Review new referrals and assign to intake nurses
4. Monitor staff caseloads and productivity
5. Prepare for or conduct IDG meeting
6. Review any open incidents or grievances
7. Generate end-of-day operational report

---

## 3. Registered Nurse (RN)

**Role Description:** Primary clinical care provider responsible for patient assessments, care coordination, HOPE documentation, and visit documentation. Case manager for assigned patients.

### Dashboard View
- My Caseload (assigned patients)
- Today's Visits (scheduled with navigation)
- Overdue Items (assessments, HOPE, recertifications)
- SFV Alerts (Symptom Follow-Up due within 2 days)
- Pending Physician Orders
- Upcoming Recertifications
- Messages/Tasks

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Caseload | FULL | View/manage assigned patients only |
| Referral/Intake | FULL | Conduct eligibility screening, admission visits |
| Assessments | FULL | Initial (48hr), Comprehensive, HOPE, PRN |
| HOPE Module | FULL | HOPE-Admission, HUV1, HUV2, SFV, Discharge |
| Visit Documentation | FULL | Skilled nursing visits, phone calls, conferences |
| Care Plans | FULL | Create/update care plans, problems/goals/interventions |
| Orders | CREATE/VIEW | Enter verbal orders, request new orders |
| Medications | FULL | Medication reconciliation, administration records |
| DME | CREATE/VIEW | Order equipment, track delivery status |
| Scheduling | OWN | View/manage own schedule |
| IDG | PARTICIPATE | Present patient updates, document IDG notes |
| Recertification | INITIATE | Prepare clinical summary for MD certification |
| Discharge | INITIATE | Death visits, revocation, discharge documentation |
| Billing | NONE | No access |

### Key Workflows

#### New Admission Workflow
1. Referrals → Accept assigned referral
2. Complete eligibility screening (REF-002)
3. Schedule and conduct admission visit
4. Complete Election Statement (ADM-001)
5. Document Patient Rights acknowledgment
6. Complete Initial Assessment within 48 hours
7. Complete HOPE-Admission (Days 0-5)
8. Develop initial Care Plan

#### Daily Visit Workflow
1. Dashboard → Today's Visits
2. Review patient chart before visit
3. Navigate to patient (mobile app integration)
4. Complete visit documentation (vitals, assessment, interventions)
5. Update care plan if needed
6. Enter orders/medication changes
7. Check for SFV triggers (HOPE symptoms)
8. Sign and finalize visit note

#### HOPE Assessment Workflow
1. Dashboard alerts → HOPE Due
2. Open HOPE Module for patient
3. Select assessment type (Admission/HUV1/HUV2/SFV/Discharge)
4. Complete all required sections
5. System checks for SFV triggers (J0510-J0580)
6. If SFV triggered → auto-scheduled within 2 days
7. Sign and submit for iQIES queue

---

## 4. Physician / Medical Director (MD)

**Role Description:** Hospice Medical Director or attending physician responsible for certifications, care plan approvals, orders, and medical oversight. May also serve as IDG physician.

### Dashboard View
- Orders Pending Signature
- Care Plans Pending Approval
- Certifications Due (initial and recerts)
- Face-to-Face Encounters Due
- IDG Meeting Agenda
- Census Overview

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Patient Census | READ ALL | View all hospice patients |
| Certifications (CTI) | FULL | Review clinical summary, sign CTI, F2F attestation |
| Orders | FULL | Create/sign/modify orders, verbal order co-sign |
| Care Plans | APPROVE | Review and approve care plans, sign IDG reviews |
| Medications | FULL | Prescribe, modify, discontinue medications |
| Assessments | READ | View nursing/therapy assessments |
| Visit Notes | READ | View all discipline visit notes |
| IDG | FULL | Lead IDG, sign meeting documentation |
| Face-to-Face | FULL | Document F2F encounters, attestation |
| Discharge | APPROVE | Approve non-death discharges |
| Billing | NONE | No access |

### Key Workflows

#### Order Signature Workflow
1. Dashboard → Orders Pending Signature
2. Review order details and clinical context
3. Approve/Modify/Reject order
4. Apply electronic signature

#### Certification Workflow
1. Dashboard → Certifications Due
2. Review RN-prepared clinical narrative
3. Review assessments, visit notes, lab results
4. For 3rd+ periods: Complete F2F encounter
5. Attest to terminal prognosis (≤6 months)
6. Sign CTI with electronic signature

#### IDG Meeting Workflow
1. IDG Module → Current Meeting
2. Review patient list and RN summaries
3. Discuss care plan updates with team
4. Approve care plan revisions
5. Sign IDG meeting documentation

---

## 5. Hospice Aide / CNA

**Role Description:** Provides personal care services under RN supervision. Documents ADL assistance, vital signs, and patient observations. Limited to assigned patients and specific documentation.

### Dashboard View
- Today's Visits (with patient addresses)
- My Assigned Patients
- Care Plan Tasks (assigned interventions)
- Messages from RN Supervisor

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Patients | LIMITED | View assigned patients only |
| Aide Visit Notes | FULL | Document aide visits (ADLs, vitals, observations) |
| Care Plan | READ | View care plan tasks assigned to aide |
| Schedule | OWN | View own schedule only |
| Assessments | NONE | No access to clinical assessments |
| Medications | READ | View medication list (no administration) |
| Orders | NONE | No access |
| Billing | NONE | No access |

### Visit Documentation Workflow
1. Dashboard → Today's Visits
2. Select patient visit
3. Review care plan tasks assigned
4. Complete Aide Visit Note:
   - Vital signs (if ordered)
   - ADL assistance provided (bathing, dressing, grooming)
   - Skin observations
   - Patient/caregiver concerns
   - Time in/time out
5. Report any changes to supervising RN
6. Sign and submit visit note

---

## 6. Medical Social Worker (MSW)

**Role Description:** Provides psychosocial assessments, counseling, resource coordination, and bereavement services. Participates in comprehensive assessments and IDG.

### Dashboard View
- My Caseload
- Today's Visits
- Psychosocial Assessments Due
- Bereavement Cases (active)
- Upcoming IDG Meetings
- Resource Referrals Pending

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Caseload | FULL | View/manage assigned patients |
| Psychosocial Assessment | FULL | Initial and ongoing assessments |
| Bereavement Assessment | FULL | Risk assessment, bereavement plan development |
| MSW Visit Notes | FULL | Counseling visits, resource coordination |
| Bereavement Module | FULL | 13-month bereavement follow-up tracking |
| Care Plans | CONTRIBUTE | Add psychosocial problems/goals/interventions |
| Clinical Records | READ | View nursing/medical notes for coordination |
| IDG | PARTICIPATE | Present psychosocial updates |
| Resource Directory | FULL | Community resources, referral tracking |
| Billing | NONE | No access |

### Key Workflows

#### Psychosocial Assessment Workflow
1. Dashboard → Assessments Due
2. Complete initial psychosocial assessment (within 5 days)
3. Document: coping, support system, financial concerns, advance directives
4. Identify resource needs and referrals
5. Add psychosocial problems to care plan

#### Bereavement Workflow
1. Patient death triggers bereavement enrollment
2. Complete bereavement risk assessment
3. Develop 13-month bereavement plan
4. Schedule follow-up contacts (calls, visits, mailings)
5. Document all bereavement contacts
6. Close case after 13 months or as appropriate

---

## 7. Chaplain / Spiritual Care

**Role Description:** Provides spiritual assessments, counseling, and support to patients and families. Coordinates with community clergy and participates in IDG.

### Dashboard View
- My Caseload
- Today's Visits
- Spiritual Assessments Due
- Recent Deaths (memorial support)
- IDG Schedule

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Caseload | FULL | View/manage assigned patients |
| Spiritual Assessment | FULL | Initial and ongoing spiritual assessments |
| Chaplain Visit Notes | FULL | Counseling, prayer, sacramental support |
| Care Plans | CONTRIBUTE | Add spiritual care problems/goals/interventions |
| Clinical Records | READ | View for care coordination |
| Bereavement | CONTRIBUTE | Memorial services, grief support |
| IDG | PARTICIPATE | Present spiritual care updates |
| Billing | NONE | No access |

### Spiritual Assessment Workflow
1. Dashboard → Assessments Due
2. Complete spiritual assessment (within 5 days of admission)
3. Document: faith tradition, spiritual concerns, practices, community resources
4. Identify spiritual care needs
5. Add spiritual care goals to care plan
6. Coordinate with patient's clergy if requested

---

## 8. Physical / Occupational / Speech Therapist

**Role Description:** Provides therapy services for comfort, safety, and quality of life. Documents therapy assessments and treatment sessions. Works under physician orders.

### Dashboard View
- Today's Visits
- Therapy Evaluations Due
- Active Therapy Patients
- Orders Pending
- IDG Schedule

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Patients | LIMITED | View patients with active therapy orders |
| Therapy Evaluation | FULL | PT/OT/ST initial and discharge evaluations |
| Therapy Visit Notes | FULL | Treatment sessions, progress notes |
| Care Plans | CONTRIBUTE | Add therapy goals and interventions |
| Orders | READ | View therapy orders |
| Clinical Records | READ | View nursing notes for coordination |
| DME | RECOMMEND | Recommend equipment (RN/MD orders) |
| IDG | PARTICIPATE | Present therapy updates |
| Billing | NONE | No access |

### Therapy Visit Workflow
1. Dashboard → Today's Visits
2. Review therapy orders and care plan goals
3. Conduct therapy session
4. Document: treatment provided, patient response, progress toward goals
5. Update care plan if goals met or revised
6. Communicate with RN regarding patient status changes

---

## 9. Management / Supervisory Staff

**Role Description:** Clinical supervisors (DON, Clinical Manager) responsible for staff oversight, quality assurance, and clinical operations. May include Quality Manager and Compliance Officer roles.

### Dashboard View
- Team Caseload Summary
- Staff Productivity Metrics
- Compliance Dashboard (overdue items)
- Quality Measure Performance
- Pending Approvals
- Incident Reports

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| All Patient Records | READ/REVIEW | View all charts for oversight (co-sign capability) |
| Staff Schedules | FULL | Create/modify staff schedules, manage coverage |
| Caseload Management | FULL | Assign/reassign patients, balance workloads |
| Co-Signature Queue | FULL | Review and co-sign clinical documentation |
| Chart Audits | FULL | Conduct audits, document findings, track corrections |
| Incident Reports | FULL | Review, investigate, assign corrective actions |
| Quality/QAPI | FULL | Quality metrics, improvement projects |
| Competency Tracking | FULL | Staff competencies, training records |
| Reports | FULL | Operational, clinical, compliance reports |
| Billing | READ | View for operational oversight |

---

## 10. Billing Staff

**Role Description:** Responsible for claims submission, payment posting, denial management, and accounts receivable. Limited clinical access for billing verification only.

### Dashboard View
- Claims Ready to Submit
- Pending Payments
- Denials Requiring Action
- NOE Status (pending/accepted/rejected)
- AR Aging Summary
- Revenue by Payer

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Claims Management | FULL | Create, submit, track claims |
| Payment Posting | FULL | Post payments, adjustments, refunds |
| Denial Management | FULL | Work denials, appeals, resubmissions |
| NOE Management | FULL | Submit NOE, track status, correct rejections |
| NTUC | FULL | Generate and submit discharge notices |
| Insurance Verification | FULL | Verify eligibility, benefits, authorizations |
| AR Reports | FULL | Aging, collections, revenue reports |
| Patient Demographics | EDIT | Update insurance info, addresses for billing |
| Clinical Records | LIMITED READ | View CTI, LOC, diagnosis for claim verification |
| Assessments/Notes | NONE | No access to detailed clinical notes |

### Claims Workflow
1. Dashboard → Claims Ready to Submit
2. System auto-generates claims from visit documentation
3. Review claim for accuracy (dates, LOC, diagnosis)
4. Verify CTI on file and valid for service dates
5. Submit claim electronically (DDE or clearinghouse)
6. Track claim status through adjudication
7. Post payment when received
8. Work any denials or partial payments

---

## 11. Surveyor / Auditor (Read-Only)

**Role Description:** External surveyors (state, accreditation) or internal auditors with read-only access to clinical and administrative records for compliance review. Cannot modify any data.

### Dashboard View
- Patient Census
- Quick Search (patient lookup)
- Report Library

### Module Access

| Module | Access | Available Functions |
|--------|--------|---------------------|
| All Patient Records | READ ONLY | View complete clinical records |
| Assessments | READ ONLY | View all assessments including HOPE |
| Care Plans | READ ONLY | View care plans and IDG documentation |
| Visit Notes | READ ONLY | View all discipline notes |
| Orders | READ ONLY | View physician orders |
| Certifications | READ ONLY | View CTI, F2F documentation |
| Staff Records | READ ONLY | View credentials, competencies |
| Policies & Procedures | READ ONLY | View P&P documents |
| Incident Reports | READ ONLY | View incidents and investigations |
| QAPI | READ ONLY | View quality improvement documentation |
| Reports | READ ONLY | Generate and view compliance reports |
| Audit Logs | READ ONLY | View system access logs |
| ALL MODULES | NO EDIT | Cannot create, modify, or delete any records |

### Survey/Audit Workflow
1. Login with temporary surveyor credentials
2. Search for specific patient or select from census
3. Navigate through chart sections to review documentation
4. Generate reports as needed for audit documentation
5. Export or print records (with audit trail logging)
6. All access is logged for HIPAA compliance

---

## 12. Volunteer / Volunteer Coordinator

### A. Volunteer (Direct Service)

**Role Description:** Volunteers provide companionship, respite, and support services to patients and families.

#### Dashboard View
- My Assigned Patients
- Today's/This Week's Scheduled Visits
- My Hours Log
- Messages from Coordinator
- Training/Competency Status

#### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Patients | LIMITED | View assigned patients only (name, address, basic info) |
| Patient Preferences | READ | View patient interests, preferences |
| Volunteer Visit Notes | FULL | Document visits (activities, observations, time) |
| Hours Tracking | OWN | Log volunteer hours, mileage |
| Schedule | OWN | View own schedule, request changes |
| Training Portal | OWN | Complete training modules, view certifications |
| Clinical Records | NONE | No access |
| Medications | NONE | No access |
| Billing | NONE | No access |

#### Volunteer Visit Workflow
1. Dashboard → Today's Visits
2. Review patient preferences and special instructions
3. Navigate to patient location
4. Provide volunteer services:
   - Companionship and conversation
   - Reading to patient
   - Light errands or meal preparation
   - Caregiver respite
   - Vigil support (end of life presence)
5. Complete Volunteer Visit Note:
   - Date/time in and out
   - Activities performed
   - Patient/family mood and observations
   - Any concerns to report to staff
6. Log hours and mileage
7. Submit visit note (routes to Volunteer Coordinator)

#### Important Volunteer Guidelines
- ⚠️ NEVER provide clinical care or administer medications
- ⚠️ Report any changes in patient condition to RN immediately
- ⚠️ Maintain patient confidentiality at all times
- ⚠️ Do not discuss patient information outside of EHR documentation
- ⚠️ Follow infection control and safety protocols

---

### B. Volunteer Coordinator

**Role Description:** Staff member responsible for recruiting, training, scheduling, and supervising volunteers. Tracks volunteer hours for Medicare 5% compliance requirement.

#### Dashboard View
- Volunteer Hours Summary (MTD/YTD vs. 5% target)
- Active Volunteers List
- Pending Visit Notes for Review
- Training/Competency Expiring Soon
- Volunteer Requests from Clinical Staff
- Unscheduled Patient Needs

#### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Volunteer Management | FULL | Recruit, onboard, manage volunteer records |
| Volunteer Scheduling | FULL | Create schedules, match volunteers to patients |
| Hours Tracking | FULL | Review, approve, report volunteer hours |
| Training Management | FULL | Assign training, track completions |
| Volunteer Visit Notes | REVIEW | Review and approve volunteer documentation |
| Patient Census | READ | View patient list for volunteer matching |
| Patient Preferences | EDIT | Update volunteer-related preferences |
| Care Plans | LIMITED | View volunteer services section only |
| Reports | VOLUNTEER | Volunteer hours reports, 5% compliance |
| IDG | PARTICIPATE | Report on volunteer services |
| Billing | NONE | No access |

#### Key Workflows

##### New Volunteer Onboarding
1. Volunteer Management → Add New Volunteer
2. Enter volunteer demographics and contact info
3. Document background check completion
4. Assign required training modules
5. Track training completion
6. Document competency verification
7. Activate volunteer for scheduling
8. Assign volunteer to appropriate patients

##### 5% Compliance Monitoring
1. Reports → Volunteer Compliance Dashboard
2. Review current volunteer hours vs. total patient care hours
3. Calculate percentage (must be ≥5%)
4. Identify patients not receiving volunteer services
5. Increase volunteer utilization if below target
6. Generate compliance report for Administrator

#### Medicare 5% Volunteer Requirement

> **42 CFR 418.78(e):** Hospices must use volunteers in day-to-day administrative and/or direct patient care roles. These services must equal at least 5% of total patient care hours.

| Metric | Calculation |
|--------|-------------|
| Total Patient Care Hours | Sum of all paid clinical staff hours |
| Volunteer Hours Target | Total Patient Care Hours × 5% |
| Actual Volunteer Hours | Sum of all documented volunteer visit hours |
| Compliance Status | Actual ÷ Target × 100 (must be ≥100%) |

**Services That Count:**
- Direct patient companionship visits
- Caregiver respite
- Vigil/continuous presence at end of life
- Patient transportation
- Administrative support (office tasks, mailings)
- Bereavement support activities
- Community outreach and education

---

## 13. Licensed Practical Nurse (LPN)

**Role Description:** Provides skilled nursing care under RN supervision. Documents visits, administers medications, and performs treatments within LPN scope. Cannot perform initial assessments, develop care plans independently, or complete HOPE assessments.

### Dashboard View
- Today's Visits (assigned by RN supervisor)
- My Assigned Patients
- Pending Co-Signatures (from supervising RN)
- Medication Administration Due
- Messages from RN Supervisor

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| My Patients | LIMITED | View assigned patients only |
| LPN Visit Notes | FULL | Document visits (requires RN co-sign) |
| Vital Signs | FULL | Record and monitor vital signs |
| Medication Admin | FULL | Administer medications, document MAR |
| Wound Care | DOCUMENT | Perform and document wound treatments |
| Care Plans | READ | View care plan (cannot modify) |
| Initial Assessments | NONE | Cannot perform (RN only) |
| HOPE Assessments | NONE | Cannot perform (RN only) |
| Orders | READ | View and implement orders (cannot enter) |
| Schedule | OWN | View own schedule |
| Billing | NONE | No access |

### LPN Visit Workflow
1. Dashboard → Today's Visits
2. Review patient chart and current orders
3. Conduct skilled nursing visit
4. Document: vitals, medication admin, treatments, observations
5. Report any changes to supervising RN
6. Submit visit note → Routes to RN for co-signature
7. Note finalized after RN approval

### ⚠️ LPN Scope Limitations in Hospice
- Cannot perform initial or comprehensive assessments
- Cannot complete HOPE assessments (RN only per CMS)
- Cannot develop or modify care plans independently
- Cannot take verbal orders from physicians
- All documentation requires RN co-signature
- Must report patient status changes to RN immediately

---

## 14. Nurse Practitioner (NP)

**Role Description:** Advanced practice provider who may serve in clinical or medical director capacity. Can perform Face-to-Face encounters for recertification (3rd+ periods), prescribe medications, and provide medical oversight. In some states, may serve as attending physician.

### Dashboard View
- Face-to-Face Encounters Due
- Orders Pending Signature
- Prescriptions Requiring Review
- Patient Census Overview
- Upcoming Recertifications
- IDG Meeting Schedule

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Patient Census | FULL READ | View all hospice patients |
| Face-to-Face Module | FULL | Conduct/document F2F for 3rd+ benefit periods |
| Orders | FULL | Write, sign, and modify orders |
| Prescriptions | FULL | E-prescribe, modify medications (per state scope) |
| NP Visit Notes | FULL | Document NP visits and consultations |
| Assessments | READ/CREATE | View all, create NP assessments |
| Care Plans | APPROVE | Review and approve (if delegated by MD) |
| Certifications (CTI) | LIMITED | Prepare F2F narrative (MD signs CTI) |
| IDG | PARTICIPATE | Attend and contribute to IDG meetings |
| Clinical Records | FULL READ | View all clinical documentation |
| Billing | NONE | No access |

### Face-to-Face Encounter Workflow
1. Dashboard → F2F Encounters Due
2. Review patient chart and clinical trajectory
3. Schedule and conduct in-person F2F visit
4. Document clinical findings supporting terminal prognosis
5. Complete F2F attestation narrative
6. Sign F2F documentation
7. F2F routes to Medical Director for CTI signature

> **42 CFR 418.22:** An NP employed by or under arrangement with the hospice may perform the Face-to-Face encounter for recertification (3rd and subsequent benefit periods). The NP must attest that the encounter occurred, document clinical findings, and the Hospice Medical Director must still sign the CTI.

---

## 15. Bereavement Coordinator

**Role Description:** Manages the hospice bereavement program, coordinating grief support services for families for at least 13 months following patient death. Develops bereavement plans, conducts risk assessments, facilitates support groups, and ensures regulatory compliance.

### Dashboard View
- Active Bereavement Cases
- Contacts Due This Week/Month
- New Deaths (bereavement enrollment pending)
- High-Risk Family Alerts
- Upcoming Support Groups/Events
- Cases Approaching 13-Month Close

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Bereavement Module | FULL | Full management of bereavement program |
| Bereavement Enrollment | FULL | Enroll families after patient death |
| Risk Assessment | FULL | Complete bereavement risk assessments |
| Bereavement Plan | FULL | Develop 13-month contact plans |
| Contact Documentation | FULL | Document calls, visits, mailings, groups |
| Support Groups | FULL | Schedule, document group sessions |
| Memorial Events | FULL | Plan and track memorial services |
| Patient Records | LIMITED | View deceased patient info for context |
| Family Contacts | FULL | Manage family/caregiver contact info |
| Reports | BEREAVEMENT | Bereavement compliance and utilization |
| IDG | PARTICIPATE | Report on bereavement services |
| Billing | NONE | No access |

### New Bereavement Case Workflow
1. Patient death triggers bereavement alert
2. Review pre-death bereavement risk assessment (from MSW)
3. Enroll family members in bereavement program
4. Complete/update bereavement risk assessment
5. Develop individualized 13-month bereavement plan
6. Schedule initial contact (typically within 2-4 weeks of death)
7. Set up recurring contact schedule based on risk level

### 13-Month Contact Schedule by Risk Level

| Risk Level | Contact Frequency | Contact Types |
|------------|-------------------|---------------|
| Low Risk | Quarterly | Mailings, phone calls, group invitations |
| Moderate Risk | Monthly | Phone calls, mailings, individual sessions |
| High Risk | Bi-weekly to weekly | Home visits, individual counseling, referrals |

---

## 16. Executive Director

**Role Description:** Senior leadership responsible for overall agency operations, strategic planning, regulatory compliance, and organizational performance. Has broad access for oversight but typically delegates day-to-day clinical and billing operations.

### Dashboard View
- Census Summary & Trends
- Financial Dashboard (Revenue, AR, Days in AR)
- Quality Measure Performance
- HQRP Compliance Status
- Incident/Grievance Summary
- Staff Utilization Metrics
- Referral Conversion Rates

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| All Clinical Records | READ | View any patient record for oversight |
| All Financial Reports | FULL | Revenue, AR, profitability, payer mix |
| Quality/QAPI | FULL | Quality metrics, improvement projects |
| Compliance Dashboard | FULL | Regulatory compliance monitoring |
| Staff Management | READ | View staff rosters, productivity |
| Incident Reports | FULL | Review all incidents, approve investigations |
| Grievances | FULL | Oversee grievance resolution |
| Contracts/Payers | FULL | Manage payer contracts, rates |
| Reports | FULL | All operational and financial reports |
| Audit Logs | READ | View system activity for compliance |
| System Configuration | LIMITED | Agency settings (not technical config) |

---

## 17. Clinical Director / Manager

**Role Description:** Oversees all clinical operations including nursing, therapy, social work, and spiritual care. Responsible for clinical staff supervision, quality of care, regulatory compliance, and care delivery standards. Often serves as Director of Nursing (DON) or Director of Patient Care Services (DPCS).

### Dashboard View
- Clinical Compliance Dashboard
- Overdue Items (assessments, visits, recerts)
- Staff Caseloads & Productivity
- HOPE Submission Status
- Quality Measure Performance
- Pending Co-Signatures
- IDG Schedule
- Incident Reports Requiring Review

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| All Patient Records | FULL | View, review, co-sign all documentation |
| Staff Scheduling | FULL | Create schedules, manage coverage, approve PTO |
| Caseload Management | FULL | Assign patients, balance workloads |
| Co-Signature Queue | FULL | Review and co-sign LPN notes, new staff |
| Assessments/HOPE | REVIEW | Audit assessments, ensure HOPE compliance |
| Care Plans | FULL | Review, approve, ensure IDG updates |
| IDG Management | FULL | Schedule, facilitate, document IDG meetings |
| Chart Audits | FULL | Conduct audits, track deficiencies |
| Competency Tracking | FULL | Manage staff training and competencies |
| Incident Reports | FULL | Review, investigate, assign corrections |
| Quality/QAPI | FULL | Quality metrics, improvement projects |
| Reports | CLINICAL | All clinical and operational reports |
| Billing | READ | View for operational awareness |

---

## 18. Medical Records Coordinator

**Role Description:** Manages health information including record requests, release of information (ROI), chart completion tracking, record retention, and HIPAA compliance. Ensures documentation is complete, properly signed, and maintained according to regulatory requirements.

### Dashboard View
- Pending Record Requests
- Incomplete Charts (missing signatures, documents)
- Discharged Charts Pending Closure
- Documents Pending Upload/Scan
- ROI Requests In Progress
- Chart Audit Schedule

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| All Patient Records | READ | View all records for ROI and chart review |
| Document Management | FULL | Upload, scan, organize documents |
| Release of Information | FULL | Process record requests, track authorizations |
| Chart Completion | FULL | Track missing items, send reminders to staff |
| Signature Tracking | FULL | Monitor pending signatures, escalate overdue |
| Record Retention | FULL | Manage retention schedules, archive/purge |
| Audit Trail | READ | View access logs for HIPAA compliance |
| Discharge Records | FULL | Finalize and close discharged patient charts |
| Deficiency Reports | FULL | Generate reports of incomplete documentation |
| Clinical Notes | READ ONLY | View but cannot modify clinical documentation |
| Billing | NONE | No access |

### ROI Workflow
1. Receive record request (fax, mail, portal)
2. Log request in ROI module
3. Verify valid authorization (signed, dated, specific)
4. Retrieve requested records
5. Review for completeness and accuracy
6. Redact information not covered by authorization
7. Send records via secure method
8. Document completion in ROI log

---

## 19. Dietitian / Nutritionist

**Role Description:** Provides nutritional assessments, counseling, and recommendations for comfort-focused nutrition and hydration. Works with patients experiencing eating difficulties, weight loss, or specific dietary needs. Focuses on quality of life rather than aggressive nutritional intervention.

### Dashboard View
- Nutrition Consult Requests
- Scheduled Visits
- Patients with Nutritional Concerns
- Follow-up Assessments Due
- IDG Schedule

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Referred Patients | LIMITED | View patients with dietitian orders |
| Nutrition Assessment | FULL | Complete nutritional assessments |
| Dietitian Visit Notes | FULL | Document consultations and recommendations |
| Care Plans | CONTRIBUTE | Add nutrition-related goals/interventions |
| Clinical Records | READ | View relevant clinical info |
| Medications | READ | View for drug-nutrient interactions |
| Orders | READ | View dietitian orders |
| IDG | PARTICIPATE | Present nutrition updates as needed |
| Billing | NONE | No access |

### Comfort-Focused Nutrition Approach
- Pleasure foods over strict diets
- Small frequent meals and favorite foods
- Family education on decreased appetite expectations
- Texture modifications for swallowing difficulties
- Artificial nutrition/hydration counseling
- Quality of life prioritized over nutritional metrics

---

## 20. Massage / Music Therapist

**Role Description:** Provides complementary therapies to enhance comfort, reduce anxiety, and improve quality of life. Massage therapy addresses pain, tension, and relaxation. Music therapy uses music interventions for emotional expression, comfort, and legacy projects.

### Dashboard View
- Today's Scheduled Sessions
- Therapy Consult Requests
- Active Therapy Patients
- Session Notes Pending

### Module Access

| Module | Access | Key Functions |
|--------|--------|---------------|
| Referred Patients | LIMITED | View patients with therapy orders |
| Therapy Assessment | FULL | Initial and ongoing therapy assessments |
| Session Notes | FULL | Document therapy sessions |
| Care Plans | CONTRIBUTE | Add therapy goals and interventions |
| Clinical Records | LIMITED | View safety-relevant info (skin, precautions) |
| Patient Preferences | READ | View music preferences, comfort needs |
| Schedule | OWN | View and manage own schedule |
| IDG | PARTICIPATE | Report on therapy services as needed |
| Orders | READ | View therapy orders |
| Billing | NONE | No access |

### Therapy Session Workflow
1. Dashboard → Today's Sessions
2. Review patient chart for precautions and preferences
3. Conduct therapy session
4. Document session note:
   - Interventions provided
   - Patient response
   - Symptom relief observed
   - Recommendations for ongoing care
5. Submit note

### Massage Therapy Services
- Gentle massage for relaxation and comfort
- Pain and tension reduction
- Lymphedema management
- Anxiety reduction through touch
- Caregiver respite and stress relief

### Music Therapy Services
- Live music for comfort and engagement
- Song-writing and legacy projects
- Music-assisted relaxation and imagery
- Life review through music
- Family music experiences
- Vigil music at end of life

---

## Document Information

| Field | Value |
|-------|-------|
| Document Title | Hospice EHR Role-Based Workflows |
| Organization | Engrace Hospice |
| Location | Portland, Oregon |
| Version | 1.0 |
| Date | January 2025 |
| Classification | CONFIDENTIAL |

---

*This document is confidential and intended for internal use only. All access to patient health information must comply with HIPAA regulations and organizational policies.*
