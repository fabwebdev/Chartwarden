SECTION I: EXECUTIVE OVERVIEW
1.1 Document Purpose & Regulatory Framework
This comprehensive manual defines end-to-end clinical and administrative workflows for the Engrace Hospice Electronic Health Record (EHR) system, ensuring full compliance with Medicare Conditions of Participation (42 CFR Part 418), the Hospice Outcomes and Patient Evaluation (HOPE) assessment tool, and Oregon state hospice regulations.
Regulatory Sources
Regulatory Source	Key Requirements
42 CFR Part 418	Medicare Hospice Conditions of Participation - Patient rights, assessments, care planning, IDG, organizational standards
FY 2025 Final Rule (CMS-1810-F)	HOPE assessment implementation, election statement clarifications, physician certification updates
FY 2024 Final Rule	Certifying physician PECOS enrollment requirements (effective May 1, 2024)
HQRP Requirements	HOPE data submission, CAHPS survey, quality measure reporting, 90% compliance threshold
HIPAA (45 CFR 160, 164)	Privacy and security standards for protected health information
1.2 Critical Compliance Timelines
The EHR system enforces mandatory timelines. Failure to meet these timelines may result in claim denials, survey deficiencies, or payment reductions.

Activity	Timeline	Regulation	System Enforcement
Notice of Election (NOE)	5 days from election	42 CFR 418.24	Auto-alert at Day 3
Initial Assessment (RN)	48 hours	42 CFR 418.54(a)	HARD STOP - blocks billing
Comprehensive Assessment	5 days	42 CFR 418.54(b)	HARD STOP - blocks care plan
HOPE-Admission	Days 0-5	FY 2025 Final Rule	Dashboard alert + reminder
HOPE Update Visit 1 (HUV1)	Days 6-15	FY 2025 Final Rule	Auto-schedule trigger
HOPE Update Visit 2 (HUV2)	Days 16-30	FY 2025 Final Rule	Auto-schedule trigger
Symptom Follow-Up (SFV)	2 calendar days	FY 2025 Final Rule	Immediate alert on trigger
IDG Care Plan Review	Every 15 days	42 CFR 418.56	Auto-populate IDG list
Face-to-Face Encounter	30 days before 3rd+ period	42 CFR 418.22	60-day advance alert
HOPE Data Submission	30 days from event	HQRP Requirements	Submission queue tracking
NTUC (Discharge)	5 days from discharge	Medicare guidelines	Auto-generate on discharge
 
SECTION II: 10-PHASE CLINICAL WORKFLOW
The hospice patient journey is organized into ten distinct phases, each with specific EHR workflows, documentation requirements, and system validations.
Workflow Phase Summary
#	Phase	Primary Activities	Key EHR Modules
1	Pre-Admission & Referral	Referral intake, eligibility screening, insurance verification	Referral Management, Eligibility Engine
2	Patient Admission	Election statement, NOE, patient rights, staff assignment	Admission Module, Staff Scheduler
3	Initial & Comprehensive Assessment	48-hr initial, 5-day comprehensive, HOPE-Admission	Assessment Engine, HOPE Module
4	Certification of Terminal Illness	CTI documentation, physician certification, F2F	Certification Module, Physician Portal
5	Care Plan Development	Problem identification, goals, interventions, LOC	Care Plan Builder, Order Management
6	Visit Scheduling & Field Ops	Visit scheduling, mobile documentation, HOPE updates	Scheduler, Mobile App, Visit Documentation
7	IDG Review	15-day care plan review, team conference	IDG Meeting Module, Care Plan Updates
8	Ongoing Care & Coordination	Medication management, DME, SIA	Pharmacy Module, DME Tracking
9	Discharge Management	Discharge processing, HOPE-Discharge, bereavement	Discharge Module, Bereavement Tracker
10	Billing & Compliance	Claims, HQRP reporting, quality metrics	Billing Engine, Analytics Dashboard
 
PHASE 1: PRE-ADMISSION & REFERRAL MANAGEMENT
1.1 Referral Intake - Screen: REF-001
Navigation: Dashboard → Referrals → + New Referral
Section A: Referral Source Information
Field Name	Data Type	Required	Validation Rules
Referral Source Type	Dropdown	Yes	Hospital, SNF, Physician, Home Health, Family, Self, Other
Referring Facility Name	Autocomplete	Conditional	Required if Source = Hospital/SNF/Home Health
Referring Physician NPI	NPI Lookup	Conditional	10-digit NPI with NPPES validation
Referral Contact Name	Text	Yes	Person initiating referral for follow-up
Referral Contact Phone	Phone	Yes	Format: (XXX) XXX-XXXX
Referral Date/Time	DateTime	Yes	Default: Current. Cannot be future.
Referral Method	Dropdown	Yes	Phone, Fax, Electronic, In-Person, Email
Section B: Patient Demographics
Field Name	Data Type	Required	Validation Rules
Patient Last Name	Text	Yes	Max 50 chars, letters/hyphens/apostrophes
Patient First Name	Text	Yes	Max 50 chars
Date of Birth	Date	Yes	MM/DD/YYYY. Past date only. Age auto-calculated.
SSN	SSN (masked)	Conditional	XXX-XX-XXXX. Required for Medicare. Encrypted.
Gender	Dropdown	Yes	Male, Female, Other, Unknown
Preferred Language	Dropdown	Yes	Triggers interpreter alert if non-English
Race	Multi-select	Yes	OMB categories for HQRP reporting
Ethnicity	Dropdown	Yes	Hispanic/Latino, Non-Hispanic, Unknown
Veteran Status	Dropdown	Yes	Yes/No/Unknown. Triggers VA coordination if Yes.
Section C: Clinical Information
Field Name	Data Type	Required	Validation Rules
Primary Terminal Diagnosis	ICD-10 Lookup	Yes	ICD-10-CM with LCD validation
Secondary Diagnoses	ICD-10 Multi	No	Up to 24 secondary diagnoses
Prognosis (Reported)	Dropdown	Yes	6 months or less, Uncertain, Unknown
Functional Status (PPS)	Dropdown 0-100	No	Palliative Performance Scale if known
Current Symptoms	Multi-select	No	Pain, SOB, Nausea, Anxiety, Fatigue, Other
Allergies	Text/List	Yes	NKDA or specific allergies
Code Status	Dropdown	Yes	Full Code, DNR, DNR/DNI, POLST, Unknown
Section D: Insurance Information
Field Name	Data Type	Required	Validation Rules
Primary Insurance Type	Dropdown	Yes	Medicare, Medicaid, MA, Commercial, VA, Self-Pay
Medicare Beneficiary ID (MBI)	MBI Format	Conditional	11-char alphanumeric. Required if Medicare. HETS validation.
Medicare Part A Effective	Date	Conditional	Required for Medicare. Verify via HETS.
Medicaid ID	Text	Conditional	Required if Medicaid selected
Medicare Advantage Plan	Plan Lookup	Conditional	If MA, verify prior auth requirements
 
1.2 Eligibility Screening - Screen: REF-002
Navigation: Referrals → [Select] → Eligibility Assessment
The eligibility screening module provides decision support for determining hospice appropriateness based on CMS Local Coverage Determinations (LCDs).
General Eligibility Criteria (All Diagnoses)
Criterion	Response	Impact
Terminal illness with prognosis ≤6 months	Yes/No/Unknown	Required = Yes
Patient elects palliative over curative care	Yes/No/Unknown	Required = Yes
Medicare Part A coverage (if Medicare)	Yes/No/N/A	Required if Medicare
PPS Score ≤70% (or significant decline)	Yes/No/Unknown	Supporting
Recurrent hospitalizations in past 6 months	Yes/No/Unknown	Supporting
Significant weight loss (>10% in 6 months)	Yes/No/Unknown	Supporting
Declining functional status (ADLs)	Yes/No/Unknown	Supporting
Disease-Specific LCD Criteria
Cancer: Metastasized/locally aggressive, declined/failed treatment, significant functional decline
Heart Disease (CHF): NYHA Class IV or recurrent III, EF ≤20%, treatment-resistant arrhythmias, recurrent hospitalizations
Pulmonary (COPD/IPF): Disabling dyspnea at rest, FEV1 <30%, O2-dependent, cor pulmonale
Dementia: FAST Stage 7C+, unable to ambulate/dress/bathe, incontinence, ≤6 intelligible words/day, plus complication in past 12 months
Renal Disease: CrCl <10cc/min (<15 for diabetics), serum Cr >8.0 (>6.0 diabetics), declined dialysis, uremic symptoms
Liver Disease: End-stage cirrhosis (PT >5 sec, albumin <2.5), refractory ascites/encephalopathy, variceal bleeding, hepatorenal syndrome
ALS: VC <30%, dyspnea at rest, declined ventilation, critical nutritional impairment, life-threatening complications
Stroke/Coma: Comatose with abnormal brainstem responses, persistent vegetative state >3 days, PPS ≤40%
1.3 Physician Enrollment Verification
CRITICAL (Effective May 1, 2024): All certifying physicians must be enrolled in Medicare or opted-out per PECOS.
Physician Role	PECOS Requirement	System Validation
Hospice Medical Director	Must be enrolled or opted-out	HARD STOP - blocks CTI
Hospice Attending Physician	Must be enrolled or opted-out	HARD STOP - blocks CTI
Patient's Attending Physician	Must be enrolled or opted-out if certifying	Warning with override
Face-to-Face NP	NPs don't require enrollment for F2F	No verification required
 
PHASE 2: PATIENT ADMISSION
2.1 Admission Prerequisites
Prerequisite	Status	Override
Insurance eligibility verified (within 7 days)	Required	No
Eligibility screening completed	Required	No
Primary diagnosis documented	Required	No
Patient location in service area	Required	No
Caregiver/emergency contact documented	Required	No
Referring physician order received	Recommended	Yes - with note
2.2 Election Statement (42 CFR 418.24) - Screen: ADM-001
Navigation: Referrals → [Select] → Convert to Admission → Election Statement
Required Election Statement Elements:
Element	Field Type	Validation
Hospice Organization Name	Auto-populated	'Engrace Hospice' with CCN
Patient Name	Auto-populated	From demographics - patient verifies
Effective Date of Election	Date picker	Cannot be before referral. Max future = 3 days.
Acknowledgment: Palliative Care	Checkbox + Signature	Required - system can read aloud
Acknowledgment: Waiver of Benefits	Checkbox + Signature	Required - explicit waiver language
Designated Attending Physician	Physician lookup	Optional. If none: 'Declined to designate'
Patient/Representative Signature	E-signature	Required - digital or wet with witness
Signature Date	Date (auto)	Must be ≤ election effective date
Representative Relationship	Dropdown	Required if representative signs
Witness Signature	E-signature	Hospice staff - cannot be admitting nurse
2.3 Notice of Election (NOE) - Screen: ADM-002
TIMELINE: NOE must be submitted to MAC within 5 calendar days of election. Late submission = payment starts from NOE date, not election date.
NOE Workflow:
1.	System generates NOE upon admission completion
2.	NOE queued for electronic submission to MAC
3.	System transmits via DDE or clearinghouse
4.	MAC returns acceptance/rejection in 24-48 hours
5.	Dashboard displays status and days remaining
2.4 Staff Assignment - Screen: ADM-004
SYSTEM ENFORCEMENT: Patient cannot transition to 'Admitted' until all required team members assigned.
Role	Required	Selection Criteria	Responsibilities
Hospice Physician	YES	Medical Director or designee	CTI, care plan approval, oversight
Primary RN	YES	Territory/caseload-based	Assessments, coordination, HOPE
MSW	YES	Hospice MSW	Psychosocial assessment, resources
Chaplain	YES	Patient preference	Spiritual assessment, counseling
Attending Physician	If designated	Patient's personal MD	Medical consultation, orders
Hospice Aide/CNA	If ordered	Competency-verified	Personal care, ADL assistance
Bereavement Coord	Auto-assigned	Default	Family support, grief services
 
PHASE 3: INITIAL & COMPREHENSIVE ASSESSMENT
3.1 Assessment Timeline Requirements
Assessment Type	Timeline	Performed By	Regulatory Cite
Initial Assessment	Within 48 hours	RN (required)	42 CFR 418.54(a)
Comprehensive Assessment	Within 5 days	IDG members	42 CFR 418.54(b)
HOPE-Admission	Days 0-5	RN (in-person)	FY 2025 Final Rule
Psychosocial Assessment	Within 5 days	MSW	42 CFR 418.54(b)
Spiritual Assessment	Within 5 days	Chaplain	42 CFR 418.54(b)
Bereavement Assessment	Within 5 days	MSW/Chaplain	42 CFR 418.54(c)
3.2 Initial Assessment (48-Hour) - Screen: ASM-001
Navigation: Patients → [Patient] → Assessments → Initial Assessment
Physical Assessment Components:
Area	Elements	Scoring
General Appearance	Distress, consciousness, orientation	Alert/Confused/Lethargic/Unresponsive
Vital Signs	BP, HR, RR, Temp, O2 Sat, Weight	Numeric with normal range flags
Pain Assessment	Location, intensity, quality, duration	0-10 scale + descriptors (HOPE J0510)
Respiratory	Breath sounds, dyspnea, O2 use	Clear/Diminished/Wheezes/Crackles
Cardiovascular	Heart sounds, edema, perfusion	Regular/Irregular + edema 0-4+
Neurological	LOC, pupils, motor/sensory	GCS or descriptive
GI	Appetite, nausea, bowel function	Last BM, N/V frequency, intake %
GU	Continence, catheter, output	Continent/Incontinent/Catheter
Integumentary	Skin, wounds, pressure injuries	Braden Scale + wound staging
Musculoskeletal	Mobility, ROM, contractures	Ambulatory/Assist/Bed-bound
Functional Status (ADL/IADL):
ADL	Response Options
Bathing	Independent / Setup / Supervision / Limited Assist / Extensive Assist / Total Dependence
Dressing	Independent / Setup / Supervision / Limited Assist / Extensive Assist / Total Dependence
Toileting	Independent / Setup / Supervision / Limited Assist / Extensive Assist / Total Dependence
Transferring	Independent / Setup / Supervision / Limited Assist / Extensive Assist / Total Dependence
Eating	Independent / Setup / Supervision / Limited Assist / Extensive Assist / Total Dependence
Ambulation	Independent / Device / 1-Person Assist / 2-Person Assist / Non-Ambulatory
PPS Score	Palliative Performance Scale: 0-100% in 10% increments
 
SECTION III: HOPE ASSESSMENT INTEGRATION
The Hospice Outcomes and Patient Evaluation (HOPE) assessment tool replaces the Hospice Item Set (HIS) effective October 1, 2025. HOPE is a standardized patient assessment instrument collecting data at multiple timepoints.
3.1 HOPE Assessment Timepoints
Timepoint	Window	Visit Type	Submission Deadline
HOPE-Admission	Days 0-5	In-person RN	30 days from admission
HUV1	Days 6-15	In-person RN	30 days from completion
HUV2	Days 16-30	In-person RN	30 days from completion
SFV	Within 2 days	In-person RN	30 days from completion
HOPE-Discharge	At discharge	Chart-based OK	30 days from discharge
3.2 HOPE Section J - Symptom Assessment
Critical for Quality Measures - triggers SFV requirements
Item #	Symptom	Scale	SFV Trigger
J0510	Pain Severity	0-10 numeric	≥4 → SFV
J0520	Shortness of Breath	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0530	Nausea	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0540	Vomiting	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0550	Anxiety	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0560	Constipation	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0570	Diarrhea	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0580	Agitation	0=None,1=Mild,2=Mod,3=Severe	2 or 3 → SFV
J0600	Pain Impact-Function	0-4 frequency scale	Pain Impact Measure
J0700	Pain Impact-Sleep	0-4 frequency scale	Pain Impact Measure
J0800	Pain Impact-Mood	0-4 frequency scale	Pain Impact Measure
J2053	SFV Symptom Impact	Post-SFV reassessment	Quality numerator
3.3 HOPE Quality Measures
Measure 1: Timely Reassessment of Pain Impact
Denominator: Patients with J0510 ≥4 OR J0600/J0700/J0800 ≥2
Numerator: SFV within 2 days with J2053 completed
Measure 2: Timely Reassessment of Non-Pain Symptoms
Denominator: Patients with J0520-J0580 = 2 (Moderate) or 3 (Severe)
Numerator: SFV within 2 days with J2053 completed
SFV Trigger Logic
1. On HOPE save: Check J0510 ≥4 and J0520-J0580 ≥2
2. If trigger: SFV_Due = Assessment_Date + 2 calendar days
3. Create SFV task → Primary RN with immediate alert
4. SFV requires: symptom reassessment + J2053
5. Maximum 3 SFVs per hospice stay
 
SECTION V: SYSTEM VALIDATION RULES
5.1 Validation Categories
Category	Behavior	Use Case
HARD STOP	Prevents action	Critical compliance (billing without CTI)
SOFT ALERT	Warning + override	Best practices
INFO	Notice only	Reminders
5.2 Key Validation Rules
ID	Rule	Type	Trigger
ADM-V01	Insurance verified before admission	HARD STOP	Status ≠ Verified
ADM-V02	Election signature required	HARD STOP	Empty
ASM-V01	Initial assessment 48 hours	HARD STOP	Blocks billing
ASM-V02	Comprehensive assessment 5 days	HARD STOP	Blocks care plan
ASM-V04	Pain ≥4 triggers SFV	HARD STOP	Auto-task
CTI-V01	CTI required for billing	HARD STOP	Claims blocked
CTI-V02	MD PECOS verified	HARD STOP	Verification failed
CTI-V03	F2F for 3rd+ period	HARD STOP	No F2F
CPL-V01	Care plan MD approval	HARD STOP	No signature
CPL-V05	IDG review q15 days	SOFT ALERT	>12 days
 
SECTION VI: PROCESS FLOWCHARTS
6.1 Patient Admission Flow
flowchart TD     A[Referral] --> B{Service Area?}     B -->|Yes| C[Demographics]     B -->|No| Z[Decline]     C --> D[Insurance Verify]     D --> E{Eligible?}     E -->|Yes| F[Screen]     F --> G{Criteria Met?}     G -->|Yes| H[Admission Visit]     H --> I[Election]     I --> J[Signatures]     J --> K[Assign Team]     K --> L[NOE Submit]     L --> M[ADMITTED]     M --> N[48hr Assessment]     M --> O[HOPE Days 0-5]
6.2 HOPE Assessment Flow
flowchart TD     A[Admit] --> B[HOPE-Admission]     B --> C{Symptoms?}     C -->|Mod/Severe| D[SFV 2 days]     C -->|OK| E[Continue]     D --> E     E --> F{LOS ≥6?}     F -->|Yes| G[HUV1]     F -->|No| H[Discharge]     G --> I{LOS ≥16?}     I -->|Yes| J[HUV2]     I -->|No| H     J --> K[Ongoing]     K --> L{Discharge?}     L -->|Yes| H     L -->|No| M[IDG q15]     M --> K     H --> N[HOPE-Discharge]     N --> O[Submit iQIES]
6.3 Certification Flow
flowchart TD     A[CTI] --> B{PECOS OK?}     B -->|Yes| C[Certify]     B -->|No| D[Block]     C --> E[Period 1: 90d]     E --> F[Recert]     F --> G[Period 2: 90d]     G --> H{3rd Period?}     H -->|Yes| I[F2F Required]     I --> J[Recert]     J --> K[60d Periods]     K --> L[Loop to F2F]
 
SECTION VIII: BILLING & REVENUE CYCLE
8.1 Medicare Payment Rates (FY 2025)
Level of Care	Rev	Rate	Description
RHC Days 1-60	0651	$228.53/day	Standard home care
RHC Days 61+	0652	$180.53/day	Reduced rate after 60
CHC	0655	$63.01/hr	≥8 hours nursing
GIP	0656	$1,145.89/day	Inpatient
Respite	0657	$500.80/day	Max 5 days
SIA	Q5003	$43.65/15min	Last 7 days RN/MSW
8.2 Denial Management
Denial Reason	Cause	Resolution
No Valid CTI	Missing certification	Complete CTI, resubmit
No NOE	NOE not submitted	Submit NOE, appeal
Not Eligible	Part A inactive	Verify eligibility
No F2F	Missing for 3rd+ period	Complete F2F attestation
Invalid Dx	Wrong ICD-10	Correct code
CHC Criteria	<8 hours nursing	Review documentation
8.3 HQRP Compliance
Threshold: 90% HOPE submission within 30 days to avoid 4% APU reduction
 
APPENDIX A: ELECTION STATEMENT
HOSPICE ELECTION STATEMENT
I, _________________________ (Patient), understand I have a terminal illness with prognosis ≤6 months.
I acknowledge:
1. I elect hospice from: ENGRACE HOSPICE (CCN: ______)
2. Hospice is palliative, not curative
3. I waive Medicare payment for terminal treatment by non-hospice providers
4. I may continue Medicare for unrelated conditions
5. I may revoke at any time
Effective Date: _____________ Attending MD (if any): _____________ NPI: _______
____________________________________ ___________
Patient/Rep Signature                          Date
Rep Name: _________________ Relationship: _________________
____________________________________ ___________
Witness Signature                               Date
 
APPENDIX B: CTI TEMPLATE
CERTIFICATION OF TERMINAL ILLNESS
Patient: _________________________ DOB: ________ MBI: ___________
Diagnosis: _________________________ ICD-10: ___________
Period: ☐ Initial (90d) ☐ Second (90d) ☐ Subsequent (60d)  #: ____
Clinical Narrative:
________________________________________________________________
________________________________________________________________
I certify this patient is terminally ill with prognosis ≤6 months.
Hospice MD: _________________ NPI: _______ Signature: _________ Date: _____
Attending MD: ________________ NPI: _______ Signature: _________ Date: _____
For 3rd+ Periods - F2F Attestation:
I had F2F encounter within 30 days before period start.
F2F Date: _________ By: ☐ Hospice MD ☐ Hospice NP
 
APPENDIX C: GLOSSARY
Term	Definition
APU	Annual Payment Update - 4% reduction for HQRP non-compliance
CAHPS	Consumer Assessment of Healthcare Providers - patient experience survey
CCN	CMS Certification Number - 6-digit provider ID
CHC	Continuous Home Care - ≥8 hours nursing in 24hr period
CTI	Certification of Terminal Illness - physician attestation ≤6 months
F2F	Face-to-Face Encounter - required for 3rd+ benefit periods
GIP	General Inpatient Care - inpatient symptom management
HOPE	Hospice Outcomes and Patient Evaluation - replaces HIS Oct 2025
HQRP	Hospice Quality Reporting Program - quality measures tied to APU
HUV	HOPE Update Visit - scheduled reassessment (HUV1: 6-15d, HUV2: 16-30d)
IDG	Interdisciplinary Group - reviews each patient every 15 days
LCD	Local Coverage Determination - eligibility criteria by diagnosis
MBI	Medicare Beneficiary Identifier - 11-character patient ID
NOE	Notice of Election - submit to MAC within 5 days
PECOS	Provider Enrollment System - MD enrollment verification
PPS	Palliative Performance Scale - functional status 0-100%
RHC	Routine Home Care - standard hospice level
SFV	Symptom Follow-Up Visit - required within 2 days for mod/severe symptoms
SIA	Service Intensity Add-On - RN/MSW in last 7 days of life
