import { ClinicalTemplate } from 'types/richTextEditor';

// ==============================|| CLINICAL DOCUMENTATION TEMPLATES ||============================== //

export const clinicalTemplates: ClinicalTemplate[] = [
  // Nursing Assessment Templates
  {
    id: 'nursing-initial-assessment',
    name: 'Initial Nursing Assessment',
    category: 'nursing_assessment',
    description: 'Comprehensive initial nursing assessment template',
    content: `<h2>Initial Nursing Assessment</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>
<p><strong>Patient Name:</strong> [Patient name]</p>
<p><strong>MRN:</strong> [Medical record number]</p>

<h3>Chief Complaint</h3>
<p>[Describe patient's primary concern or reason for admission]</p>

<h3>History of Present Illness</h3>
<p>[Document onset, duration, character, aggravating/alleviating factors]</p>

<h3>Vital Signs</h3>
<ul>
<li>Blood Pressure: ___/___ mmHg</li>
<li>Heart Rate: ___ bpm</li>
<li>Respiratory Rate: ___ breaths/min</li>
<li>Temperature: ___°F</li>
<li>O2 Saturation: ___%</li>
<li>Pain Level: ___/10</li>
</ul>

<h3>Assessment Findings</h3>
<p>[Document physical assessment findings by system]</p>

<h3>Plan of Care</h3>
<p>[Outline immediate nursing interventions and care plan]</p>

<p><strong>Nurse Signature:</strong> _______________</p>`
  },
  {
    id: 'nursing-daily-assessment',
    name: 'Daily Nursing Assessment',
    category: 'nursing_assessment',
    description: 'Daily shift assessment template',
    content: `<h2>Daily Nursing Assessment</h2>
<p><strong>Date:</strong> [Enter date] | <strong>Shift:</strong> [Day/Evening/Night]</p>

<h3>Patient Status</h3>
<p><strong>Level of Consciousness:</strong> [Alert/Oriented/Confused/Lethargic/Unresponsive]</p>
<p><strong>Activity Level:</strong> [Independent/Assisted/Bedbound]</p>

<h3>Systems Review</h3>
<p><strong>Neurological:</strong> [Assessment findings]</p>
<p><strong>Cardiovascular:</strong> [Assessment findings]</p>
<p><strong>Respiratory:</strong> [Assessment findings]</p>
<p><strong>Gastrointestinal:</strong> [Assessment findings]</p>
<p><strong>Genitourinary:</strong> [Assessment findings]</p>
<p><strong>Integumentary:</strong> [Assessment findings]</p>
<p><strong>Musculoskeletal:</strong> [Assessment findings]</p>

<h3>Changes from Previous Assessment</h3>
<p>[Document any changes in patient condition]</p>

<h3>Interventions Provided</h3>
<p>[List nursing interventions performed this shift]</p>`
  },

  // Pain Assessment Templates
  {
    id: 'pain-comprehensive',
    name: 'Comprehensive Pain Assessment',
    category: 'pain_assessment',
    description: 'Full pain evaluation using PQRST method',
    content: `<h2>Comprehensive Pain Assessment</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>

<h3>Pain Evaluation (PQRST)</h3>
<p><strong>P - Provocative/Palliative:</strong></p>
<ul>
<li>What makes the pain worse? [Document]</li>
<li>What makes the pain better? [Document]</li>
</ul>

<p><strong>Q - Quality:</strong></p>
<p>Pain description: [Sharp/Dull/Burning/Aching/Throbbing/Stabbing/Other]</p>

<p><strong>R - Region/Radiation:</strong></p>
<p>Location: [Primary location]</p>
<p>Radiation: [Does pain radiate? Where?]</p>

<p><strong>S - Severity:</strong></p>
<p>Current pain level: ___/10</p>
<p>Worst pain in 24 hours: ___/10</p>
<p>Best pain in 24 hours: ___/10</p>

<p><strong>T - Timing:</strong></p>
<p>Onset: [When did pain start?]</p>
<p>Duration: [Constant/Intermittent]</p>
<p>Pattern: [Any pattern noted?]</p>

<h3>Impact on Function</h3>
<p>Effect on sleep: [Document]</p>
<p>Effect on mobility: [Document]</p>
<p>Effect on mood: [Document]</p>

<h3>Current Pain Management</h3>
<p>[List current medications and interventions]</p>

<h3>Recommendations</h3>
<p>[Document recommended changes or continuation of current plan]</p>`
  },
  {
    id: 'pain-reassessment',
    name: 'Pain Reassessment',
    category: 'pain_assessment',
    description: 'Follow-up pain evaluation after intervention',
    content: `<h2>Pain Reassessment</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>
<p><strong>Time since intervention:</strong> [Minutes/Hours]</p>

<h3>Previous Pain Level</h3>
<p>Pain score before intervention: ___/10</p>

<h3>Intervention Provided</h3>
<p>[Medication given/Non-pharmacological intervention]</p>

<h3>Current Pain Level</h3>
<p>Pain score after intervention: ___/10</p>

<h3>Patient Response</h3>
<p>Relief obtained: [None/Partial/Complete]</p>
<p>Side effects noted: [Yes/No - if yes, describe]</p>
<p>Patient satisfaction with pain management: [Satisfied/Not satisfied]</p>

<h3>Plan</h3>
<p>[Continue current plan/Modify plan - document changes]</p>`
  },

  // Symptom Management Templates
  {
    id: 'symptom-general',
    name: 'Symptom Management Note',
    category: 'symptom_management',
    description: 'General symptom documentation and management',
    content: `<h2>Symptom Management Note</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>

<h3>Symptom Identified</h3>
<p><strong>Primary Symptom:</strong> [Identify symptom]</p>
<p><strong>Onset:</strong> [When did it start?]</p>
<p><strong>Severity:</strong> [Mild/Moderate/Severe]</p>
<p><strong>Associated Symptoms:</strong> [List any related symptoms]</p>

<h3>Assessment</h3>
<p>[Document clinical assessment findings]</p>

<h3>Intervention</h3>
<p>[Document interventions provided]</p>

<h3>Patient Response</h3>
<p>[Document patient's response to intervention]</p>

<h3>Follow-up Plan</h3>
<p>[Document follow-up timeline and expected outcomes]</p>`
  },

  // Care Plan Templates
  {
    id: 'care-plan-update',
    name: 'Care Plan Update',
    category: 'care_plan',
    description: 'Document changes to patient care plan',
    content: `<h2>Care Plan Update</h2>
<p><strong>Date:</strong> [Enter date]</p>
<p><strong>Updated by:</strong> [Name and credentials]</p>

<h3>Current Status</h3>
<p>[Summarize current patient condition]</p>

<h3>Goals Reviewed</h3>
<ul>
<li><strong>Goal 1:</strong> [Status: Met/Partially Met/Not Met]</li>
<li><strong>Goal 2:</strong> [Status: Met/Partially Met/Not Met]</li>
<li><strong>Goal 3:</strong> [Status: Met/Partially Met/Not Met]</li>
</ul>

<h3>Changes to Care Plan</h3>
<p><strong>Added:</strong> [New interventions or goals]</p>
<p><strong>Modified:</strong> [Changes to existing interventions]</p>
<p><strong>Discontinued:</strong> [Interventions no longer needed]</p>

<h3>Rationale for Changes</h3>
<p>[Explain clinical reasoning for changes]</p>

<h3>Patient/Family Input</h3>
<p>[Document any input from patient or family]</p>

<h3>Next Review Date</h3>
<p>[Enter date for next care plan review]</p>`
  },

  // Progress Note Templates
  {
    id: 'progress-note-soap',
    name: 'SOAP Progress Note',
    category: 'progress_note',
    description: 'Standard SOAP format progress note',
    content: `<h2>Progress Note</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>

<h3>S - Subjective</h3>
<p><strong>Patient Reports:</strong></p>
<p>[Document patient's own words about their condition, symptoms, concerns]</p>

<h3>O - Objective</h3>
<p><strong>Vital Signs:</strong></p>
<ul>
<li>BP: ___/___ | HR: ___ | RR: ___ | Temp: ___ | SpO2: ___%</li>
</ul>
<p><strong>Physical Assessment:</strong></p>
<p>[Document observable findings]</p>
<p><strong>Labs/Tests:</strong></p>
<p>[Document relevant results]</p>

<h3>A - Assessment</h3>
<p><strong>Clinical Impression:</strong></p>
<p>[Document clinical assessment of patient status]</p>
<p><strong>Problems Addressed:</strong></p>
<ol>
<li>[Problem 1 - status]</li>
<li>[Problem 2 - status]</li>
</ol>

<h3>P - Plan</h3>
<p><strong>Interventions:</strong></p>
<p>[Document planned interventions]</p>
<p><strong>Patient Education:</strong></p>
<p>[Document education provided]</p>
<p><strong>Follow-up:</strong></p>
<p>[Document follow-up plan]</p>`
  },

  // Discharge Summary Templates
  {
    id: 'discharge-summary',
    name: 'Discharge Summary',
    category: 'discharge_summary',
    description: 'Comprehensive discharge documentation',
    content: `<h2>Discharge Summary</h2>
<p><strong>Date of Discharge:</strong> [Enter date]</p>
<p><strong>Discharge Destination:</strong> [Home/Facility/Hospital]</p>

<h3>Reason for Admission</h3>
<p>[Document primary diagnosis and reason for hospice admission]</p>

<h3>Course of Care Summary</h3>
<p>[Summarize key events during hospice care]</p>

<h3>Condition at Discharge</h3>
<p>[Document patient's status at time of discharge]</p>

<h3>Discharge Medications</h3>
<ol>
<li>[Medication 1 - dose, frequency, instructions]</li>
<li>[Medication 2 - dose, frequency, instructions]</li>
</ol>

<h3>Discharge Instructions</h3>
<p>[Document specific instructions given to patient/family]</p>

<h3>Follow-up Care</h3>
<p>[Document follow-up appointments and care instructions]</p>

<h3>Education Provided</h3>
<p>[List topics covered with patient/family]</p>

<p><strong>Patient/Family verbalized understanding:</strong> [Yes/No]</p>
<p><strong>Discharge completed by:</strong> [Name and credentials]</p>`
  },

  // Family Communication Templates
  {
    id: 'family-communication',
    name: 'Family Communication Note',
    category: 'family_communication',
    description: 'Document communication with family members',
    content: `<h2>Family Communication Note</h2>
<p><strong>Date/Time:</strong> [Enter date and time]</p>
<p><strong>Communication Method:</strong> [In-person/Phone/Video]</p>

<h3>Family Member(s) Present</h3>
<p>[Name(s) and relationship to patient]</p>

<h3>Topics Discussed</h3>
<ul>
<li>[Topic 1]</li>
<li>[Topic 2]</li>
<li>[Topic 3]</li>
</ul>

<h3>Information Provided</h3>
<p>[Document specific information shared with family]</p>

<h3>Family Questions/Concerns</h3>
<p>[Document questions asked and responses provided]</p>

<h3>Family Response/Coping</h3>
<p>[Document emotional state and coping observed]</p>

<h3>Plan/Follow-up</h3>
<p>[Document any agreed-upon next steps]</p>`
  },

  // Interdisciplinary Note Templates
  {
    id: 'idg-meeting-note',
    name: 'IDG Meeting Note',
    category: 'interdisciplinary_note',
    description: 'Interdisciplinary group meeting documentation',
    content: `<h2>Interdisciplinary Group Meeting Note</h2>
<p><strong>Date:</strong> [Enter date]</p>
<p><strong>Review Period:</strong> [From date to date]</p>

<h3>Team Members Present</h3>
<ul>
<li>Physician: [Name]</li>
<li>Nurse: [Name]</li>
<li>Social Worker: [Name]</li>
<li>Chaplain: [Name]</li>
<li>Other: [Name and discipline]</li>
</ul>

<h3>Patient Status Summary</h3>
<p><strong>Current Condition:</strong> [Stable/Declining/Improved]</p>
<p><strong>Prognosis:</strong> [Document current prognosis]</p>

<h3>Discipline Updates</h3>
<p><strong>Nursing:</strong> [Update]</p>
<p><strong>Social Work:</strong> [Update]</p>
<p><strong>Spiritual Care:</strong> [Update]</p>
<p><strong>Physician:</strong> [Update]</p>

<h3>Goals of Care</h3>
<p>[Review and document current goals]</p>

<h3>Care Plan Modifications</h3>
<p>[Document any changes to care plan]</p>

<h3>Next Review Date</h3>
<p>[Enter date for next IDG review]</p>`
  },

  // Medication Review Templates
  {
    id: 'medication-review',
    name: 'Medication Review',
    category: 'medication_review',
    description: 'Comprehensive medication reconciliation',
    content: `<h2>Medication Review</h2>
<p><strong>Date:</strong> [Enter date]</p>
<p><strong>Reviewed by:</strong> [Name and credentials]</p>

<h3>Current Medications</h3>
<ol>
<li>[Medication] - [Dose] - [Frequency] - [Indication]</li>
<li>[Medication] - [Dose] - [Frequency] - [Indication]</li>
<li>[Medication] - [Dose] - [Frequency] - [Indication]</li>
</ol>

<h3>PRN Medications</h3>
<ol>
<li>[Medication] - [Dose] - [Indication] - [Frequency used]</li>
</ol>

<h3>Medication Effectiveness</h3>
<p>[Document effectiveness of current regimen]</p>

<h3>Side Effects/Adverse Reactions</h3>
<p>[Document any reported or observed side effects]</p>

<h3>Drug Interactions Reviewed</h3>
<p>[Document any interactions identified]</p>

<h3>Recommendations</h3>
<ul>
<li><strong>Continue:</strong> [Medications to continue]</li>
<li><strong>Adjust:</strong> [Medications requiring dose changes]</li>
<li><strong>Discontinue:</strong> [Medications to stop]</li>
<li><strong>Add:</strong> [New medications recommended]</li>
</ul>

<h3>Patient/Family Education</h3>
<p>[Document education provided about medications]</p>`
  }
];

export default clinicalTemplates;
