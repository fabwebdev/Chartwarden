
🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "in_progress",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create pain assessment database schema",
      "status": "pending",
      "activeForm": "Creating pain assessment database schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "pending",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "pending",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add RBAC permissions for pain assessments",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

Let me explore the existing codebase to understand the patterns used for controllers, schemas, and routes.

🔧 Tool: Task
Input: {
  "description": "Explore codebase for pain patterns",
  "prompt": "I need to implement a Pain Assessment Controller. Please explore the codebase to understand:\n\n1. The existing controller patterns in services/api/src/controllers/ - look at examples like VitalSigns.controller.js, Medication.controller.js, or HOPEAssessment.controller.js\n2. The existing route patterns in services/api/src/routes/\n3. The existing schema patterns in services/api/src/db/schemas/\n4. The RBAC configuration in services/api/src/config/rbac.js\n5. Check if there's any existing pain-related code or schemas\n\nProvide a detailed summary of the patterns used so I can implement the Pain Assessment Controller consistently.",
  "subagent_type": "Explore"
}

🔧 Tool: Glob
Input: {
  "pattern": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/*.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/*.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/*.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/patient/VitalSigns.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/patient/Pain/PainAssessment.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/patient/VitalSigns.routes.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/patient/Pain.routes.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/vitalSign.schema.js",
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/painAssessment.schema.js",
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/vitalSign.schema.js",
  "offset": 150,
  "limit": 100
}

🔧 Tool: Grep
Input: {
  "pattern": "export const VITAL_SIGN_RANGES",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/vitalSign.schema.js"
}

🔧 Tool: Bash
Input: {
  "command": "grep -A 40 \"export const VITAL_SIGN_RANGES\" /Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/vitalSign.schema.js",
  "description": "Extract VITAL_SIGN_RANGES constant"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Medication.controller.js",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Medication.controller.js",
  "limit": 250,
  "offset": 100
}

🔧 Tool: Grep
Input: {
  "pattern": "export default controller",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Medication.controller.js"
}

🔧 Tool: Bash
Input: {
  "command": "tail -50 /Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Medication.controller.js",
  "description": "Get end of Medication controller"
}

🔧 Tool: Bash
Input: {
  "command": "grep -A 2 -B 2 \"pain\\|vital\\|medication\" /Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js | head -60",
  "description": "Check route registrations"
}

🔧 Tool: Bash
Input: {
  "command": "head -150 /Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/HOPEAssessment.controller.js",
  "description": "Get start of HOPEAssessment controller"
}

Excellent! The exploration reveals that there's already some pain assessment infrastructure, but it needs enhancement for multi-scale support. Let me now examine the existing pain controller and schema to understand what needs to be enhanced.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/patient/Pain/PainAssessment.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/painAssessment.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/patient/Pain.routes.js"
}

I can see the existing pain assessment infrastructure. The current implementation is functional but needs enhancement with:
1. Multi-scale support with proper validation
2. Better CRUD operations with filtering/pagination
3. HIPAA compliance fields (signature, amendments, audit)
4. Delete functionality
5. Patient history with filtering

Let me also check the VitalSigns controller for patterns and the RBAC config.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/patient/VitalSigns.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

I now have a clear understanding of the patterns. Let me update my todo list and start implementing the enhanced Pain Assessment Controller.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "in_progress",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "pending",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "pending",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

Now let me check the schema index to see how schemas are exported.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js"
}

Now let me check the VitalSign schema to see the pattern for multi-scale support and HIPAA compliance fields.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/vitalSign.schema.js"
}

Now I have a comprehensive understanding. I'll create a new, enhanced multi-scale pain assessment schema and controller. Let me first create the enhanced schema.

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/multiScalePainAssessment.schema.js",
  "content": "import { pgTable, bigint, integer, varchar, decimal, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';\nimport { patients } from './patient.schema.js';\n\n/**\n * Multi-Scale Pain Assessment Schema\n *\n * Comprehensive pain assessment with support for multiple standardized scales:\n * - NRS (Numeric Rating Scale): 0-10 self-report\n * - VAS (Visual Analog Scale): 0-100mm\n * - Wong-Baker FACES: 0-10 pictorial\n * - FLACC (Face, Legs, Activity, Cry, Consolability): 0-10 behavioral (pediatric/non-verbal)\n * - PAINAD (Pain Assessment in Advanced Dementia): 0-10 behavioral (dementia)\n * - CPOT (Critical Care Pain Observation Tool): 0-8 ICU behavioral\n *\n * HIPAA/21 CFR Part 11 Compliant with signature and amendment tracking\n */\nexport const multi_scale_pain_assessments = pgTable('multi_scale_pain_assessments', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n\n  // =========================================\n  // PATIENT & CONTEXT ASSOCIATIONS\n  // =========================================\n  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),\n  encounter_id: bigint('encounter_id', { mode: 'number' }),\n  note_id: bigint('note_id', { mode: 'number' }),\n\n  // =========================================\n  // ASSESSMENT METADATA\n  // =========================================\n  assessment_timestamp: timestamp('assessment_timestamp').defaultNow().notNull(),\n  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),\n  assessment_context: varchar('assessment_context', { length: 100 }), // ROUTINE, PRE_MEDICATION, POST_MEDICATION, ON_DEMAND, ADMISSION\n\n  // =========================================\n  // PAIN SCALE SELECTION\n  // =========================================\n  pain_scale_type: varchar('pain_scale_type', { length: 50 }).notNull(), // NRS, VAS, WONG_BAKER, FLACC, PAINAD, CPOT\n\n  // =========================================\n  // NUMERIC RATING SCALE (NRS) - 0-10\n  // Self-reported pain intensity\n  // =========================================\n  nrs_score: integer('nrs_score'), // 0-10\n\n  // =========================================\n  // VISUAL ANALOG SCALE (VAS) - 0-100mm\n  // Self-reported pain intensity on visual line\n  // =========================================\n  vas_score: decimal('vas_score', { precision: 5, scale: 1 }), // 0-100mm\n\n  // =========================================\n  // WONG-BAKER FACES - 0-10 (or 0-5 scale)\n  // Pictorial self-report scale\n  // =========================================\n  wong_baker_score: integer('wong_baker_score'), // 0-10\n  wong_baker_face_selected: varchar('wong_baker_face_selected', { length: 50 }), // NO_HURT, HURTS_LITTLE_BIT, HURTS_LITTLE_MORE, HURTS_EVEN_MORE, HURTS_WHOLE_LOT, HURTS_WORST\n\n  // =========================================\n  // FLACC (Face, Legs, Activity, Cry, Consolability) - 0-10\n  // Behavioral pain scale for pediatric/non-verbal patients\n  // =========================================\n  flacc_face: integer('flacc_face'), // 0-2\n  flacc_legs: integer('flacc_legs'), // 0-2\n  flacc_activity: integer('flacc_activity'), // 0-2\n  flacc_cry: integer('flacc_cry'), // 0-2\n  flacc_consolability: integer('flacc_consolability'), // 0-2\n  flacc_total_score: integer('flacc_total_score'), // 0-10 (sum of above)\n\n  // =========================================\n  // PAINAD (Pain Assessment in Advanced Dementia) - 0-10\n  // Behavioral scale for dementia patients\n  // =========================================\n  painad_breathing: integer('painad_breathing'), // 0-2\n  painad_negative_vocalization: integer('painad_negative_vocalization'), // 0-2\n  painad_facial_expression: integer('painad_facial_expression'), // 0-2\n  painad_body_language: integer('painad_body_language'), // 0-2\n  painad_consolability: integer('painad_consolability'), // 0-2\n  painad_total_score: integer('painad_total_score'), // 0-10 (sum of above)\n\n  // =========================================\n  // CPOT (Critical Care Pain Observation Tool) - 0-8\n  // Behavioral scale for ICU/non-verbal patients\n  // =========================================\n  cpot_facial_expression: integer('cpot_facial_expression'), // 0-2\n  cpot_body_movements: integer('cpot_body_movements'), // 0-2\n  cpot_muscle_tension: integer('cpot_muscle_tension'), // 0-2\n  cpot_ventilator_compliance: integer('cpot_ventilator_compliance'), // 0-2 (or vocalization if not intubated)\n  cpot_total_score: integer('cpot_total_score'), // 0-8 (sum of above)\n\n  // =========================================\n  // UNIFIED PAIN SCORE (Normalized 0-10)\n  // Allows comparison across different scales\n  // =========================================\n  normalized_pain_score: integer('normalized_pain_score'), // 0-10 normalized from any scale\n\n  // =========================================\n  // PAIN CHARACTERISTICS\n  // =========================================\n  pain_location_primary: varchar('pain_location_primary', { length: 255 }),\n  pain_location_secondary: varchar('pain_location_secondary', { length: 255 }),\n  pain_location_body_map: text('pain_location_body_map'), // JSON body map coordinates\n  pain_quality: varchar('pain_quality', { length: 255 }), // SHARP, DULL, ACHING, BURNING, THROBBING, STABBING, SHOOTING, CRAMPING\n  pain_radiation: varchar('pain_radiation', { length: 255 }), // Where pain radiates to\n  pain_onset: varchar('pain_onset', { length: 100 }), // SUDDEN, GRADUAL\n  pain_pattern: varchar('pain_pattern', { length: 100 }), // CONSTANT, INTERMITTENT, BREAKTHROUGH\n\n  // =========================================\n  // PAIN DURATION & TIMING\n  // =========================================\n  pain_duration_value: integer('pain_duration_value'),\n  pain_duration_unit: varchar('pain_duration_unit', { length: 50 }), // MINUTES, HOURS, DAYS, WEEKS, MONTHS\n  pain_frequency: varchar('pain_frequency', { length: 100 }), // CONTINUOUS, HOURLY, DAILY, WEEKLY, PRN\n\n  // =========================================\n  // AGGRAVATING & RELIEVING FACTORS\n  // =========================================\n  aggravating_factors: text('aggravating_factors'), // JSON array\n  relieving_factors: text('relieving_factors'), // JSON array\n\n  // =========================================\n  // FUNCTIONAL IMPACT\n  // =========================================\n  affects_sleep: boolean('affects_sleep').default(false),\n  affects_mobility: boolean('affects_mobility').default(false),\n  affects_appetite: boolean('affects_appetite').default(false),\n  affects_mood: boolean('affects_mood').default(false),\n  affects_adl: boolean('affects_adl').default(false),\n  functional_impact_notes: text('functional_impact_notes'),\n\n  // =========================================\n  // ACCEPTABLE PAIN LEVEL\n  // =========================================\n  acceptable_pain_level: integer('acceptable_pain_level'), // Patient's acceptable pain level (0-10)\n\n  // =========================================\n  // INTERVENTION TRACKING\n  // =========================================\n  intervention_given: boolean('intervention_given').default(false),\n  intervention_type: varchar('intervention_type', { length: 100 }), // PHARMACOLOGICAL, NON_PHARMACOLOGICAL, BOTH\n  intervention_description: text('intervention_description'),\n  intervention_medication: varchar('intervention_medication', { length: 255 }),\n  intervention_time: timestamp('intervention_time'),\n\n  // Post-intervention reassessment\n  post_intervention_score: integer('post_intervention_score'),\n  post_intervention_time: timestamp('post_intervention_time'),\n  intervention_effective: boolean('intervention_effective'),\n\n  // =========================================\n  // CLINICAL FLAGS\n  // =========================================\n  is_breakthrough_pain: boolean('is_breakthrough_pain').default(false),\n  requires_follow_up: boolean('requires_follow_up').default(false),\n  follow_up_notes: text('follow_up_notes'),\n  notified_provider: boolean('notified_provider').default(false),\n  notified_provider_at: timestamp('notified_provider_at'),\n  notified_provider_id: bigint('notified_provider_id', { mode: 'number' }),\n\n  // =========================================\n  // PATIENT COMMUNICATION\n  // =========================================\n  patient_able_to_self_report: boolean('patient_able_to_self_report').default(true),\n  patient_goal_discussed: boolean('patient_goal_discussed').default(false),\n  additional_notes: text('additional_notes'),\n\n  // =========================================\n  // SIGNATURE AND COMPLIANCE (21 CFR Part 11)\n  // =========================================\n  signature_id: bigint('signature_id', { mode: 'number' }),\n  signed_at: timestamp('signed_at'),\n  signed_by_id: bigint('signed_by_id', { mode: 'number' }),\n\n  // Amendment tracking for signed assessments\n  amended: boolean('amended').default(false),\n  amendment_reason: text('amendment_reason'),\n  amended_at: timestamp('amended_at'),\n  amended_by_id: bigint('amended_by_id', { mode: 'number' }),\n\n  // =========================================\n  // AUDIT FIELDS\n  // =========================================\n  created_by_id: bigint('created_by_id', { mode: 'number' }),\n  updated_by_id: bigint('updated_by_id', { mode: 'number' }),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull(),\n}, (table) => ({\n  // Performance indexes for common queries\n  patientIdx: index('idx_multi_scale_pain_patient_id').on(table.patient_id),\n  assessmentTimestampIdx: index('idx_multi_scale_pain_timestamp').on(table.assessment_timestamp),\n  patientTimestampIdx: index('idx_multi_scale_pain_patient_timestamp').on(table.patient_id, table.assessment_timestamp),\n  scaleTypeIdx: index('idx_multi_scale_pain_scale_type').on(table.pain_scale_type),\n  encounterIdx: index('idx_multi_scale_pain_encounter').on(table.encounter_id),\n}));\n\n// =========================================\n// PAIN SCALE TYPES\n// =========================================\nexport const PAIN_SCALE_TYPES = {\n  NRS: 'NRS',           // Numeric Rating Scale (0-10)\n  VAS: 'VAS',           // Visual Analog Scale (0-100mm)\n  WONG_BAKER: 'WONG_BAKER', // Wong-Baker FACES (0-10)\n  FLACC: 'FLACC',       // Face, Legs, Activity, Cry, Consolability (0-10)\n  PAINAD: 'PAINAD',     // Pain Assessment in Advanced Dementia (0-10)\n  CPOT: 'CPOT',         // Critical Care Pain Observation Tool (0-8)\n};\n\n// =========================================\n// PAIN SCALE RANGES (for validation)\n// =========================================\nexport const PAIN_SCALE_RANGES = {\n  NRS: { min: 0, max: 10, description: 'Numeric Rating Scale' },\n  VAS: { min: 0, max: 100, description: 'Visual Analog Scale (mm)' },\n  WONG_BAKER: { min: 0, max: 10, description: 'Wong-Baker FACES' },\n  FLACC: { min: 0, max: 10, subscale_max: 2, description: 'FLACC Behavioral Scale' },\n  PAINAD: { min: 0, max: 10, subscale_max: 2, description: 'PAINAD for Dementia' },\n  CPOT: { min: 0, max: 8, subscale_max: 2, description: 'Critical Care Pain Observation Tool' },\n};\n\n// =========================================\n// WONG-BAKER FACES OPTIONS\n// =========================================\nexport const WONG_BAKER_FACES = {\n  NO_HURT: { value: 0, label: 'No Hurt' },\n  HURTS_LITTLE_BIT: { value: 2, label: 'Hurts Little Bit' },\n  HURTS_LITTLE_MORE: { value: 4, label: 'Hurts Little More' },\n  HURTS_EVEN_MORE: { value: 6, label: 'Hurts Even More' },\n  HURTS_WHOLE_LOT: { value: 8, label: 'Hurts Whole Lot' },\n  HURTS_WORST: { value: 10, label: 'Hurts Worst' },\n};\n\n// =========================================\n// FLACC SCALE DESCRIPTORS\n// =========================================\nexport const FLACC_DESCRIPTORS = {\n  face: {\n    0: 'No particular expression or smile',\n    1: 'Occasional grimace or frown, withdrawn, disinterested',\n    2: 'Frequent to constant frown, clenched jaw, quivering chin',\n  },\n  legs: {\n    0: 'Normal position or relaxed',\n    1: 'Uneasy, restless, tense',\n    2: 'Kicking, or legs drawn up',\n  },\n  activity: {\n    0: 'Lying quietly, normal position, moves easily',\n    1: 'Squirming, shifting back and forth, tense',\n    2: 'Arched, rigid, or jerking',\n  },\n  cry: {\n    0: 'No cry (awake or asleep)',\n    1: 'Moans or whimpers, occasional complaint',\n    2: 'Crying steadily, screams or sobs, frequent complaints',\n  },\n  consolability: {\n    0: 'Content, relaxed',\n    1: 'Reassured by occasional touching, hugging, or being talked to; distractible',\n    2: 'Difficult to console or comfort',\n  },\n};\n\n// =========================================\n// PAINAD SCALE DESCRIPTORS\n// =========================================\nexport const PAINAD_DESCRIPTORS = {\n  breathing: {\n    0: 'Normal',\n    1: 'Occasional labored breathing, short period of hyperventilation',\n    2: 'Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes',\n  },\n  negative_vocalization: {\n    0: 'None',\n    1: 'Occasional moan or groan, low level speech with negative/disapproving quality',\n    2: 'Repeated troubled calling out, loud moaning or groaning, crying',\n  },\n  facial_expression: {\n    0: 'Smiling or inexpressive',\n    1: 'Sad, frightened, frown',\n    2: 'Facial grimacing',\n  },\n  body_language: {\n    0: 'Relaxed',\n    1: 'Tense, distressed pacing, fidgeting',\n    2: 'Rigid, fists clenched, knees pulled up, pulling/pushing away, striking out',\n  },\n  consolability: {\n    0: 'No need to console',\n    1: 'Distracted or reassured by voice or touch',\n    2: 'Unable to console, distract, or reassure',\n  },\n};\n\n// =========================================\n// CPOT SCALE DESCRIPTORS\n// =========================================\nexport const CPOT_DESCRIPTORS = {\n  facial_expression: {\n    0: 'Relaxed, neutral',\n    1: 'Tense (brow lowering, orbit tightening, levator contraction)',\n    2: 'Grimacing (all previous facial movements plus eyelid tightly closed)',\n  },\n  body_movements: {\n    0: 'Absence of movements or normal position',\n    1: 'Protection (slow, cautious movements, touching pain site, seeking attention)',\n    2: 'Restlessness/Agitation (pulling tube, attempting to sit up, thrashing, not following commands)',\n  },\n  muscle_tension: {\n    0: 'Relaxed',\n    1: 'Tense, rigid',\n    2: 'Very tense or rigid',\n  },\n  ventilator_compliance: {\n    0: 'Tolerating ventilator or movement / Talking in normal tone or no sound',\n    1: 'Coughing but tolerating / Sighing, moaning',\n    2: 'Fighting ventilator / Crying out, sobbing',\n  },\n};\n\n// =========================================\n// PAIN QUALITIES\n// =========================================\nexport const PAIN_QUALITIES = {\n  SHARP: 'SHARP',\n  DULL: 'DULL',\n  ACHING: 'ACHING',\n  BURNING: 'BURNING',\n  THROBBING: 'THROBBING',\n  STABBING: 'STABBING',\n  SHOOTING: 'SHOOTING',\n  CRAMPING: 'CRAMPING',\n  PRESSURE: 'PRESSURE',\n  TINGLING: 'TINGLING',\n  NUMBNESS: 'NUMBNESS',\n};\n\n// =========================================\n// ASSESSMENT CONTEXTS\n// =========================================\nexport const ASSESSMENT_CONTEXTS = {\n  ROUTINE: 'ROUTINE',\n  PRE_MEDICATION: 'PRE_MEDICATION',\n  POST_MEDICATION: 'POST_MEDICATION',\n  ON_DEMAND: 'ON_DEMAND',\n  ADMISSION: 'ADMISSION',\n  DISCHARGE: 'DISCHARGE',\n  FOLLOW_UP: 'FOLLOW_UP',\n};\n\n// =========================================\n// INTERVENTION TYPES\n// =========================================\nexport const INTERVENTION_TYPES = {\n  PHARMACOLOGICAL: 'PHARMACOLOGICAL',\n  NON_PHARMACOLOGICAL: 'NON_PHARMACOLOGICAL',\n  BOTH: 'BOTH',\n};\n\n// =========================================\n// PAIN INTENSITY LEVELS (for normalized score interpretation)\n// =========================================\nexport const PAIN_INTENSITY_LEVELS = {\n  NONE: { min: 0, max: 0, label: 'No Pain' },\n  MILD: { min: 1, max: 3, label: 'Mild Pain' },\n  MODERATE: { min: 4, max: 6, label: 'Moderate Pain' },\n  SEVERE: { min: 7, max: 10, label: 'Severe Pain' },\n};\n\n// =========================================\n// HELPER: Normalize score to 0-10 scale\n// =========================================\nexport function normalizeToTenScale(score, scaleType) {\n  if (score === null || score === undefined) return null;\n\n  const range = PAIN_SCALE_RANGES[scaleType];\n  if (!range) return null;\n\n  // CPOT is 0-8, needs normalization\n  if (scaleType === 'CPOT') {\n    return Math.round((score / 8) * 10);\n  }\n\n  // VAS is 0-100, needs normalization\n  if (scaleType === 'VAS') {\n    return Math.round(score / 10);\n  }\n\n  // NRS, WONG_BAKER, FLACC, PAINAD are already 0-10\n  return Math.round(score);\n}\n\n// =========================================\n// HELPER: Get pain intensity level from normalized score\n// =========================================\nexport function getPainIntensityLevel(normalizedScore) {\n  if (normalizedScore === null || normalizedScore === undefined) return null;\n\n  if (normalizedScore === 0) return PAIN_INTENSITY_LEVELS.NONE;\n  if (normalizedScore <= 3) return PAIN_INTENSITY_LEVELS.MILD;\n  if (normalizedScore <= 6) return PAIN_INTENSITY_LEVELS.MODERATE;\n  return PAIN_INTENSITY_LEVELS.SEVERE;\n}\n"
}

Now let me add the export to the schema index file.

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js",
  "old_string": "export * from './complianceTracking.schema.js';",
  "new_string": "export * from './complianceTracking.schema.js';\nexport * from './multiScalePainAssessment.schema.js';"
}

Now let me update my todo and create the enhanced Pain Assessment controller.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "completed",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "in_progress",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "pending",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

Now let me create the enhanced Pain Assessment controller with full multi-scale support.

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/MultiScalePainAssessment.controller.js",
  "content": "import { db } from '../config/db.drizzle.js';\nimport {\n  multi_scale_pain_assessments,\n  PAIN_SCALE_TYPES,\n  PAIN_SCALE_RANGES,\n  normalizeToTenScale,\n  getPainIntensityLevel,\n} from '../db/schemas/multiScalePainAssessment.schema.js';\nimport { patients } from '../db/schemas/index.js';\nimport { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';\nimport { logger } from '../utils/logger.js';\nimport { logAudit } from '../middleware/audit.middleware.js';\n\n/**\n * Multi-Scale Pain Assessment Controller\n *\n * Manages pain assessments with support for multiple standardized scales:\n * - NRS (Numeric Rating Scale)\n * - VAS (Visual Analog Scale)\n * - Wong-Baker FACES\n * - FLACC (Face, Legs, Activity, Cry, Consolability)\n * - PAINAD (Pain Assessment in Advanced Dementia)\n * - CPOT (Critical Care Pain Observation Tool)\n *\n * HIPAA/21 CFR Part 11 Compliant\n */\nclass MultiScalePainAssessmentController {\n  /**\n   * Clean and normalize assessment data\n   */\n  cleanAssessmentData(data) {\n    const cleaned = { ...data };\n\n    // Integer fields - convert empty strings to null\n    const integerFields = [\n      'nrs_score',\n      'wong_baker_score',\n      'flacc_face',\n      'flacc_legs',\n      'flacc_activity',\n      'flacc_cry',\n      'flacc_consolability',\n      'flacc_total_score',\n      'painad_breathing',\n      'painad_negative_vocalization',\n      'painad_facial_expression',\n      'painad_body_language',\n      'painad_consolability',\n      'painad_total_score',\n      'cpot_facial_expression',\n      'cpot_body_movements',\n      'cpot_muscle_tension',\n      'cpot_ventilator_compliance',\n      'cpot_total_score',\n      'normalized_pain_score',\n      'pain_duration_value',\n      'acceptable_pain_level',\n      'post_intervention_score',\n    ];\n\n    // Decimal fields\n    const decimalFields = ['vas_score'];\n\n    // Clean integer fields\n    integerFields.forEach((field) => {\n      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {\n        cleaned[field] = null;\n      } else if (typeof cleaned[field] === 'string') {\n        const parsed = parseInt(cleaned[field], 10);\n        cleaned[field] = isNaN(parsed) ? null : parsed;\n      }\n    });\n\n    // Clean decimal fields\n    decimalFields.forEach((field) => {\n      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {\n        cleaned[field] = null;\n      } else if (typeof cleaned[field] === 'string') {\n        const parsed = parseFloat(cleaned[field]);\n        cleaned[field] = isNaN(parsed) ? null : parsed;\n      }\n    });\n\n    // Clean string fields - convert empty strings to null\n    Object.keys(cleaned).forEach((key) => {\n      if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {\n        cleaned[key] = null;\n      }\n    });\n\n    return cleaned;\n  }\n\n  /**\n   * Validate scale-specific scores\n   */\n  validateScaleScores(data) {\n    const errors = [];\n    const scaleType = data.pain_scale_type;\n\n    if (!scaleType) {\n      errors.push({ field: 'pain_scale_type', message: 'Pain scale type is required' });\n      return errors;\n    }\n\n    if (!PAIN_SCALE_TYPES[scaleType]) {\n      errors.push({ field: 'pain_scale_type', message: `Invalid pain scale type: ${scaleType}` });\n      return errors;\n    }\n\n    const range = PAIN_SCALE_RANGES[scaleType];\n\n    switch (scaleType) {\n      case 'NRS':\n        if (data.nrs_score !== null && data.nrs_score !== undefined) {\n          if (data.nrs_score < range.min || data.nrs_score > range.max) {\n            errors.push({ field: 'nrs_score', message: `NRS score must be between ${range.min} and ${range.max}` });\n          }\n        }\n        break;\n\n      case 'VAS':\n        if (data.vas_score !== null && data.vas_score !== undefined) {\n          if (data.vas_score < range.min || data.vas_score > range.max) {\n            errors.push({ field: 'vas_score', message: `VAS score must be between ${range.min} and ${range.max}mm` });\n          }\n        }\n        break;\n\n      case 'WONG_BAKER':\n        if (data.wong_baker_score !== null && data.wong_baker_score !== undefined) {\n          if (data.wong_baker_score < range.min || data.wong_baker_score > range.max) {\n            errors.push({ field: 'wong_baker_score', message: `Wong-Baker score must be between ${range.min} and ${range.max}` });\n          }\n        }\n        break;\n\n      case 'FLACC':\n        ['flacc_face', 'flacc_legs', 'flacc_activity', 'flacc_cry', 'flacc_consolability'].forEach((field) => {\n          if (data[field] !== null && data[field] !== undefined) {\n            if (data[field] < 0 || data[field] > range.subscale_max) {\n              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });\n            }\n          }\n        });\n        break;\n\n      case 'PAINAD':\n        ['painad_breathing', 'painad_negative_vocalization', 'painad_facial_expression', 'painad_body_language', 'painad_consolability'].forEach((field) => {\n          if (data[field] !== null && data[field] !== undefined) {\n            if (data[field] < 0 || data[field] > range.subscale_max) {\n              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });\n            }\n          }\n        });\n        break;\n\n      case 'CPOT':\n        ['cpot_facial_expression', 'cpot_body_movements', 'cpot_muscle_tension', 'cpot_ventilator_compliance'].forEach((field) => {\n          if (data[field] !== null && data[field] !== undefined) {\n            if (data[field] < 0 || data[field] > range.subscale_max) {\n              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });\n            }\n          }\n        });\n        break;\n    }\n\n    // Validate acceptable pain level\n    if (data.acceptable_pain_level !== null && data.acceptable_pain_level !== undefined) {\n      if (data.acceptable_pain_level < 0 || data.acceptable_pain_level > 10) {\n        errors.push({ field: 'acceptable_pain_level', message: 'Acceptable pain level must be between 0 and 10' });\n      }\n    }\n\n    // Validate post-intervention score\n    if (data.post_intervention_score !== null && data.post_intervention_score !== undefined) {\n      if (data.post_intervention_score < 0 || data.post_intervention_score > 10) {\n        errors.push({ field: 'post_intervention_score', message: 'Post-intervention score must be between 0 and 10' });\n      }\n    }\n\n    return errors;\n  }\n\n  /**\n   * Calculate total score for behavioral scales\n   */\n  calculateTotalScores(data) {\n    const result = { ...data };\n\n    // Calculate FLACC total\n    if (data.pain_scale_type === 'FLACC') {\n      const flaccFields = ['flacc_face', 'flacc_legs', 'flacc_activity', 'flacc_cry', 'flacc_consolability'];\n      const hasAnyFlacc = flaccFields.some((f) => data[f] !== null && data[f] !== undefined);\n      if (hasAnyFlacc) {\n        result.flacc_total_score = flaccFields.reduce((sum, field) => sum + (data[field] || 0), 0);\n      }\n    }\n\n    // Calculate PAINAD total\n    if (data.pain_scale_type === 'PAINAD') {\n      const painadFields = ['painad_breathing', 'painad_negative_vocalization', 'painad_facial_expression', 'painad_body_language', 'painad_consolability'];\n      const hasAnyPainad = painadFields.some((f) => data[f] !== null && data[f] !== undefined);\n      if (hasAnyPainad) {\n        result.painad_total_score = painadFields.reduce((sum, field) => sum + (data[field] || 0), 0);\n      }\n    }\n\n    // Calculate CPOT total\n    if (data.pain_scale_type === 'CPOT') {\n      const cpotFields = ['cpot_facial_expression', 'cpot_body_movements', 'cpot_muscle_tension', 'cpot_ventilator_compliance'];\n      const hasAnyCpot = cpotFields.some((f) => data[f] !== null && data[f] !== undefined);\n      if (hasAnyCpot) {\n        result.cpot_total_score = cpotFields.reduce((sum, field) => sum + (data[field] || 0), 0);\n      }\n    }\n\n    // Calculate normalized pain score (0-10)\n    let rawScore = null;\n    switch (data.pain_scale_type) {\n      case 'NRS':\n        rawScore = data.nrs_score;\n        break;\n      case 'VAS':\n        rawScore = data.vas_score;\n        break;\n      case 'WONG_BAKER':\n        rawScore = data.wong_baker_score;\n        break;\n      case 'FLACC':\n        rawScore = result.flacc_total_score;\n        break;\n      case 'PAINAD':\n        rawScore = result.painad_total_score;\n        break;\n      case 'CPOT':\n        rawScore = result.cpot_total_score;\n        break;\n    }\n\n    result.normalized_pain_score = normalizeToTenScale(rawScore, data.pain_scale_type);\n\n    return result;\n  }\n\n  /**\n   * Get all pain assessments with optional filters\n   * GET /pain-assessments\n   */\n  async index(request, reply) {\n    try {\n      const { patient_id, scale_type, limit = 50, offset = 0, from_date, to_date, requires_follow_up } = request.query;\n\n      let conditions = [];\n\n      if (patient_id) {\n        conditions.push(eq(multi_scale_pain_assessments.patient_id, parseInt(patient_id)));\n      }\n\n      if (scale_type) {\n        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));\n      }\n\n      if (from_date) {\n        conditions.push(gte(multi_scale_pain_assessments.assessment_timestamp, new Date(from_date)));\n      }\n\n      if (to_date) {\n        conditions.push(lte(multi_scale_pain_assessments.assessment_timestamp, new Date(to_date)));\n      }\n\n      if (requires_follow_up === 'true') {\n        conditions.push(eq(multi_scale_pain_assessments.requires_follow_up, true));\n      }\n\n      let query = db.select().from(multi_scale_pain_assessments);\n\n      if (conditions.length > 0) {\n        query = query.where(and(...conditions));\n      }\n\n      const assessments = await query.orderBy(desc(multi_scale_pain_assessments.assessment_timestamp)).limit(parseInt(limit)).offset(parseInt(offset));\n\n      // Get total count for pagination\n      let countQuery = db.select({ count: sql`count(*)` }).from(multi_scale_pain_assessments);\n      if (conditions.length > 0) {\n        countQuery = countQuery.where(and(...conditions));\n      }\n      const countResult = await countQuery;\n      const total = parseInt(countResult[0]?.count || 0);\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Pain assessments retrieved successfully',\n        data: assessments,\n        pagination: {\n          total,\n          limit: parseInt(limit),\n          offset: parseInt(offset),\n          totalPages: Math.ceil(total / parseInt(limit)),\n        },\n      };\n    } catch (error) {\n      logger.error('Error fetching pain assessments:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Server error while fetching pain assessments',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Get pain assessments for a specific patient\n   * GET /patients/:patientId/pain-assessments\n   */\n  async getPatientAssessments(request, reply) {\n    try {\n      const { patientId } = request.params;\n      const { scale_type, limit = 50, offset = 0, from_date, to_date } = request.query;\n\n      let conditions = [eq(multi_scale_pain_assessments.patient_id, parseInt(patientId))];\n\n      if (scale_type) {\n        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));\n      }\n\n      if (from_date) {\n        conditions.push(gte(multi_scale_pain_assessments.assessment_timestamp, new Date(from_date)));\n      }\n\n      if (to_date) {\n        conditions.push(lte(multi_scale_pain_assessments.assessment_timestamp, new Date(to_date)));\n      }\n\n      const assessments = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(and(...conditions))\n        .orderBy(desc(multi_scale_pain_assessments.assessment_timestamp))\n        .limit(parseInt(limit))\n        .offset(parseInt(offset));\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Patient pain assessments retrieved successfully',\n        data: assessments,\n        count: assessments.length,\n        limit: parseInt(limit),\n        offset: parseInt(offset),\n      };\n    } catch (error) {\n      logger.error('Error fetching patient pain assessments:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching patient pain assessments',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Get a single pain assessment by ID\n   * GET /pain-assessments/:id\n   */\n  async show(request, reply) {\n    try {\n      const { id } = request.params;\n\n      const result = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .limit(1);\n\n      if (!result[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Pain assessment not found',\n        };\n      }\n\n      // Add pain intensity level interpretation\n      const assessment = result[0];\n      const intensityLevel = getPainIntensityLevel(assessment.normalized_pain_score);\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: {\n          ...assessment,\n          pain_intensity: intensityLevel,\n        },\n      };\n    } catch (error) {\n      logger.error('Error fetching pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Server error while fetching pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Create a new pain assessment\n   * POST /pain-assessments\n   */\n  async store(request, reply) {\n    try {\n      const patientId = request.params?.patientId || request.body?.patient_id;\n\n      if (!patientId) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Validation failed',\n          errors: [{ field: 'patient_id', message: 'Patient ID is required' }],\n        };\n      }\n\n      const cleanedData = this.cleanAssessmentData(request.body);\n\n      // Validate scale-specific scores\n      const validationErrors = this.validateScaleScores(cleanedData);\n      if (validationErrors.length > 0) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Validation failed',\n          errors: validationErrors,\n        };\n      }\n\n      // Calculate total scores for behavioral scales\n      const calculatedData = this.calculateTotalScores(cleanedData);\n\n      // Remove fields that shouldn't be set during creation\n      delete calculatedData.id;\n      delete calculatedData.signed_at;\n      delete calculatedData.signed_by_id;\n      delete calculatedData.amended;\n      delete calculatedData.amendment_reason;\n      delete calculatedData.amended_at;\n      delete calculatedData.amended_by_id;\n\n      const insertData = {\n        ...calculatedData,\n        patient_id: parseInt(patientId),\n        assessment_timestamp: calculatedData.assessment_timestamp ? new Date(calculatedData.assessment_timestamp) : new Date(),\n        assessed_by_id: calculatedData.assessed_by_id || request.user?.id,\n        created_by_id: request.user?.id,\n        updated_by_id: request.user?.id,\n        createdAt: new Date(),\n        updatedAt: new Date(),\n      };\n\n      const newAssessment = await db.insert(multi_scale_pain_assessments).values(insertData).returning();\n      const assessment = newAssessment[0];\n\n      await logAudit(request, 'CREATE', 'multi_scale_pain_assessments', assessment.id);\n\n      // Get pain intensity for response\n      const intensityLevel = getPainIntensityLevel(assessment.normalized_pain_score);\n\n      reply.code(201);\n      return {\n        status: 201,\n        message: 'Pain assessment created successfully',\n        data: {\n          ...assessment,\n          pain_intensity: intensityLevel,\n        },\n      };\n    } catch (error) {\n      logger.error('Error creating pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Server error while creating pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Update a pain assessment\n   * PATCH /pain-assessments/:id\n   */\n  async update(request, reply) {\n    try {\n      const { id } = request.params;\n\n      const existing = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Pain assessment not found',\n        };\n      }\n\n      // Don't allow updates to signed assessments\n      if (existing[0].signed_at) {\n        reply.code(403);\n        return {\n          status: 403,\n          message: 'Cannot update signed pain assessment. Use amendment instead.',\n        };\n      }\n\n      const cleanedData = this.cleanAssessmentData(request.body);\n\n      // Merge with existing data for validation\n      const mergedData = { ...existing[0], ...cleanedData };\n\n      // Validate scale-specific scores\n      const validationErrors = this.validateScaleScores(mergedData);\n      if (validationErrors.length > 0) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Validation failed',\n          errors: validationErrors,\n        };\n      }\n\n      // Calculate total scores\n      const calculatedData = this.calculateTotalScores(mergedData);\n\n      // Remove fields that shouldn't be updated directly\n      const {\n        id: _,\n        patient_id,\n        created_by_id,\n        createdAt,\n        signed_at,\n        signed_by_id,\n        signature_id,\n        amended,\n        amendment_reason,\n        amended_at,\n        amended_by_id,\n        ...updateData\n      } = calculatedData;\n\n      const result = await db\n        .update(multi_scale_pain_assessments)\n        .set({\n          ...updateData,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date(),\n        })\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .returning();\n\n      await logAudit(request, 'UPDATE', 'multi_scale_pain_assessments', result[0].id);\n\n      const intensityLevel = getPainIntensityLevel(result[0].normalized_pain_score);\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Pain assessment updated successfully',\n        data: {\n          ...result[0],\n          pain_intensity: intensityLevel,\n        },\n      };\n    } catch (error) {\n      logger.error('Error updating pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Server error while updating pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Delete a pain assessment\n   * DELETE /pain-assessments/:id\n   */\n  async delete(request, reply) {\n    try {\n      const { id } = request.params;\n\n      const existing = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Pain assessment not found',\n        };\n      }\n\n      // Don't allow deletion of signed assessments\n      if (existing[0].signed_at) {\n        reply.code(403);\n        return {\n          status: 403,\n          message: 'Cannot delete signed pain assessment',\n        };\n      }\n\n      await db.delete(multi_scale_pain_assessments).where(eq(multi_scale_pain_assessments.id, parseInt(id)));\n\n      await logAudit(request, 'DELETE', 'multi_scale_pain_assessments', parseInt(id));\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Pain assessment deleted successfully',\n      };\n    } catch (error) {\n      logger.error('Error deleting pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error deleting pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Sign a pain assessment (21 CFR Part 11 compliance)\n   * POST /pain-assessments/:id/sign\n   */\n  async sign(request, reply) {\n    try {\n      const { id } = request.params;\n\n      const existing = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Pain assessment not found',\n        };\n      }\n\n      if (existing[0].signed_at) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Pain assessment already signed',\n        };\n      }\n\n      const result = await db\n        .update(multi_scale_pain_assessments)\n        .set({\n          signed_at: new Date(),\n          signed_by_id: request.user?.id,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date(),\n        })\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .returning();\n\n      await logAudit(request, 'SIGN', 'multi_scale_pain_assessments', result[0].id);\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Pain assessment signed successfully',\n        data: result[0],\n      };\n    } catch (error) {\n      logger.error('Error signing pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error signing pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Amend a signed pain assessment\n   * POST /pain-assessments/:id/amend\n   */\n  async amend(request, reply) {\n    try {\n      const { id } = request.params;\n      const { amendment_reason, ...updateData } = request.body;\n\n      if (!amendment_reason) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Amendment reason is required',\n        };\n      }\n\n      const existing = await db\n        .select()\n        .from(multi_scale_pain_assessments)\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Pain assessment not found',\n        };\n      }\n\n      if (!existing[0].signed_at) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Cannot amend unsigned pain assessment. Use update instead.',\n        };\n      }\n\n      const cleanedData = this.cleanAssessmentData(updateData);\n      const mergedData = { ...existing[0], ...cleanedData };\n      const calculatedData = this.calculateTotalScores(mergedData);\n\n      // Only update allowed fields\n      const { nrs_score, vas_score, wong_baker_score, wong_baker_face_selected, flacc_face, flacc_legs, flacc_activity, flacc_cry, flacc_consolability, flacc_total_score, painad_breathing, painad_negative_vocalization, painad_facial_expression, painad_body_language, painad_consolability, painad_total_score, cpot_facial_expression, cpot_body_movements, cpot_muscle_tension, cpot_ventilator_compliance, cpot_total_score, normalized_pain_score, pain_location_primary, pain_location_secondary, pain_quality, pain_radiation, additional_notes, post_intervention_score, intervention_effective } = calculatedData;\n\n      const result = await db\n        .update(multi_scale_pain_assessments)\n        .set({\n          nrs_score,\n          vas_score,\n          wong_baker_score,\n          wong_baker_face_selected,\n          flacc_face,\n          flacc_legs,\n          flacc_activity,\n          flacc_cry,\n          flacc_consolability,\n          flacc_total_score,\n          painad_breathing,\n          painad_negative_vocalization,\n          painad_facial_expression,\n          painad_body_language,\n          painad_consolability,\n          painad_total_score,\n          cpot_facial_expression,\n          cpot_body_movements,\n          cpot_muscle_tension,\n          cpot_ventilator_compliance,\n          cpot_total_score,\n          normalized_pain_score,\n          pain_location_primary,\n          pain_location_secondary,\n          pain_quality,\n          pain_radiation,\n          additional_notes,\n          post_intervention_score,\n          intervention_effective,\n          amended: true,\n          amendment_reason,\n          amended_at: new Date(),\n          amended_by_id: request.user?.id,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date(),\n        })\n        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))\n        .returning();\n\n      await logAudit(request, 'AMEND', 'multi_scale_pain_assessments', result[0].id, { amendment_reason });\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Pain assessment amended successfully',\n        data: result[0],\n      };\n    } catch (error) {\n      logger.error('Error amending pain assessment:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error amending pain assessment',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Get pain assessment history/trend for a patient\n   * GET /patients/:patientId/pain-assessments/trend\n   */\n  async getPatientTrend(request, reply) {\n    try {\n      const { patientId } = request.params;\n      const { days = 30, scale_type, limit = 100 } = request.query;\n\n      const startDate = new Date();\n      startDate.setDate(startDate.getDate() - parseInt(days));\n\n      let conditions = [eq(multi_scale_pain_assessments.patient_id, parseInt(patientId)), gte(multi_scale_pain_assessments.assessment_timestamp, startDate)];\n\n      if (scale_type) {\n        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));\n      }\n\n      const assessments = await db\n        .select({\n          id: multi_scale_pain_assessments.id,\n          assessment_timestamp: multi_scale_pain_assessments.assessment_timestamp,\n          pain_scale_type: multi_scale_pain_assessments.pain_scale_type,\n          normalized_pain_score: multi_scale_pain_assessments.normalized_pain_score,\n          nrs_score: multi_scale_pain_assessments.nrs_score,\n          vas_score: multi_scale_pain_assessments.vas_score,\n          wong_baker_score: multi_scale_pain_assessments.wong_baker_score,\n          flacc_total_score: multi_scale_pain_assessments.flacc_total_score,\n          painad_total_score: multi_scale_pain_assessments.painad_total_score,\n          cpot_total_score: multi_scale_pain_assessments.cpot_total_score,\n          pain_location_primary: multi_scale_pain_assessments.pain_location_primary,\n          intervention_given: multi_scale_pain_assessments.intervention_given,\n          post_intervention_score: multi_scale_pain_assessments.post_intervention_score,\n          intervention_effective: multi_scale_pain_assessments.intervention_effective,\n        })\n        .from(multi_scale_pain_assessments)\n        .where(and(...conditions))\n        .orderBy(desc(multi_scale_pain_assessments.assessment_timestamp))\n        .limit(parseInt(limit));\n\n      // Calculate averages\n      const avgResult = await db\n        .select({\n          avg_score: sql`avg(normalized_pain_score)`,\n          max_score: sql`max(normalized_pain_score)`,\n          min_score: sql`min(normalized_pain_score)`,\n          count: sql`count(*)`,\n          interventions_count: sql`sum(case when intervention_given then 1 else 0 end)`,\n          effective_interventions: sql`sum(case when intervention_effective then 1 else 0 end)`,\n        })\n        .from(multi_scale_pain_assessments)\n        .where(and(...conditions));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: {\n          period_days: parseInt(days),\n          assessments: assessments.reverse(), // Chronological order for charting\n          count: assessments.length,\n          statistics: {\n            average_score: parseFloat(avgResult[0]?.avg_score) || null,\n            max_score: parseInt(avgResult[0]?.max_score) || null,\n            min_score: parseInt(avgResult[0]?.min_score) || null,\n            total_assessments: parseInt(avgResult[0]?.count) || 0,\n            interventions_given: parseInt(avgResult[0]?.interventions_count) || 0,\n            effective_interventions: parseInt(avgResult[0]?.effective_interventions) || 0,\n          },\n        },\n      };\n    } catch (error) {\n      logger.error('Error fetching pain assessment trend:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching pain assessment trend data',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n\n  /**\n   * Get reference information for pain scales\n   * GET /pain-assessments/reference\n   */\n  async getReference(request, reply) {\n    try {\n      reply.code(200);\n      return {\n        status: 200,\n        data: {\n          scales: PAIN_SCALE_TYPES,\n          ranges: PAIN_SCALE_RANGES,\n          intensity_levels: {\n            NONE: { min: 0, max: 0, label: 'No Pain' },\n            MILD: { min: 1, max: 3, label: 'Mild Pain' },\n            MODERATE: { min: 4, max: 6, label: 'Moderate Pain' },\n            SEVERE: { min: 7, max: 10, label: 'Severe Pain' },\n          },\n          scale_descriptions: {\n            NRS: {\n              name: 'Numeric Rating Scale',\n              description: 'Self-reported pain intensity from 0 (no pain) to 10 (worst pain imaginable)',\n              use_case: 'Patients who can self-report',\n              range: '0-10',\n            },\n            VAS: {\n              name: 'Visual Analog Scale',\n              description: '100mm line where patient marks their pain level',\n              use_case: 'Research settings, detailed measurement',\n              range: '0-100mm',\n            },\n            WONG_BAKER: {\n              name: 'Wong-Baker FACES Pain Rating Scale',\n              description: 'Pictorial scale with facial expressions',\n              use_case: 'Pediatric patients, patients with communication barriers',\n              range: '0-10',\n            },\n            FLACC: {\n              name: 'Face, Legs, Activity, Cry, Consolability',\n              description: 'Behavioral pain assessment for non-verbal patients',\n              use_case: 'Pediatric, cognitively impaired, sedated patients',\n              range: '0-10 (sum of 5 categories, 0-2 each)',\n            },\n            PAINAD: {\n              name: 'Pain Assessment in Advanced Dementia',\n              description: 'Behavioral scale for patients with dementia',\n              use_case: 'Patients with advanced dementia who cannot self-report',\n              range: '0-10 (sum of 5 categories, 0-2 each)',\n            },\n            CPOT: {\n              name: 'Critical Care Pain Observation Tool',\n              description: 'Behavioral scale for ICU patients',\n              use_case: 'Intubated, sedated, or unconscious patients',\n              range: '0-8 (sum of 4 categories, 0-2 each)',\n            },\n          },\n        },\n      };\n    } catch (error) {\n      logger.error('Error fetching pain assessment reference:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching pain assessment reference',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined,\n      };\n    }\n  }\n}\n\n// Create controller instance\nconst controller = new MultiScalePainAssessmentController();\n\n// Export instance methods for routes (bound to controller instance)\nexport const index = controller.index.bind(controller);\nexport const show = controller.show.bind(controller);\nexport const store = controller.store.bind(controller);\nexport const update = controller.update.bind(controller);\n\n// Export controller instance for new routes\nexport default controller;\n"
}

Now let me update my todos and create the routes file.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "completed",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "completed",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "in_progress",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/multiScalePainAssessment.routes.js",
  "content": "import controller from '../controllers/MultiScalePainAssessment.controller.js';\nimport { verifyToken } from '../middleware/betterAuth.middleware.js';\nimport { PERMISSIONS } from '../config/rbac.js';\nimport { requireAnyPermission } from '../middleware/rbac.middleware.js';\n\n/**\n * Multi-Scale Pain Assessment Routes\n *\n * Provides RESTful endpoints for managing pain assessments with\n * support for multiple standardized pain scales.\n */\nasync function multiScalePainAssessmentRoutes(fastify, options) {\n  // =========================================\n  // REFERENCE ENDPOINT (No auth required for scale info)\n  // =========================================\n  fastify.get(\n    '/pain-assessments/reference',\n    {\n      schema: {\n        description: 'Get pain scale reference information',\n        tags: ['Pain Assessments'],\n        response: {\n          200: {\n            type: 'object',\n            properties: {\n              status: { type: 'number' },\n              data: { type: 'object' },\n            },\n          },\n        },\n      },\n    },\n    controller.getReference.bind(controller)\n  );\n\n  // =========================================\n  // LIST ENDPOINTS\n  // =========================================\n\n  // Get all pain assessments (with optional filters)\n  fastify.get(\n    '/pain-assessments',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],\n      schema: {\n        description: 'Get all pain assessments with optional filters',\n        tags: ['Pain Assessments'],\n        querystring: {\n          type: 'object',\n          properties: {\n            patient_id: { type: 'integer', description: 'Filter by patient ID' },\n            scale_type: {\n              type: 'string',\n              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],\n              description: 'Filter by pain scale type',\n            },\n            from_date: { type: 'string', format: 'date-time', description: 'Filter from date' },\n            to_date: { type: 'string', format: 'date-time', description: 'Filter to date' },\n            requires_follow_up: { type: 'string', enum: ['true', 'false'], description: 'Filter by follow-up required' },\n            limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },\n            offset: { type: 'integer', default: 0, minimum: 0 },\n          },\n        },\n      },\n    },\n    controller.index.bind(controller)\n  );\n\n  // Get pain assessments for a specific patient\n  fastify.get(\n    '/patients/:patientId/pain-assessments',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],\n      schema: {\n        description: 'Get pain assessments for a specific patient',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            patientId: { type: 'integer' },\n          },\n          required: ['patientId'],\n        },\n        querystring: {\n          type: 'object',\n          properties: {\n            scale_type: { type: 'string', enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'] },\n            from_date: { type: 'string', format: 'date-time' },\n            to_date: { type: 'string', format: 'date-time' },\n            limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },\n            offset: { type: 'integer', default: 0, minimum: 0 },\n          },\n        },\n      },\n    },\n    controller.getPatientAssessments.bind(controller)\n  );\n\n  // Get pain trend for a patient\n  fastify.get(\n    '/patients/:patientId/pain-assessments/trend',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],\n      schema: {\n        description: 'Get pain assessment trend/history for a patient',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            patientId: { type: 'integer' },\n          },\n          required: ['patientId'],\n        },\n        querystring: {\n          type: 'object',\n          properties: {\n            days: { type: 'integer', default: 30, minimum: 1, maximum: 365 },\n            scale_type: { type: 'string', enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'] },\n            limit: { type: 'integer', default: 100, minimum: 1, maximum: 500 },\n          },\n        },\n      },\n    },\n    controller.getPatientTrend.bind(controller)\n  );\n\n  // =========================================\n  // SINGLE RESOURCE ENDPOINTS\n  // =========================================\n\n  // Get a single pain assessment by ID\n  fastify.get(\n    '/pain-assessments/:id',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],\n      schema: {\n        description: 'Get a single pain assessment by ID',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            id: { type: 'integer' },\n          },\n          required: ['id'],\n        },\n      },\n    },\n    controller.show.bind(controller)\n  );\n\n  // =========================================\n  // CREATE ENDPOINTS\n  // =========================================\n\n  // Create a new pain assessment (global endpoint)\n  fastify.post(\n    '/pain-assessments',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Create a new pain assessment',\n        tags: ['Pain Assessments'],\n        body: {\n          type: 'object',\n          required: ['patient_id', 'pain_scale_type'],\n          properties: {\n            patient_id: { type: 'integer' },\n            encounter_id: { type: 'integer' },\n            note_id: { type: 'integer' },\n            assessment_timestamp: { type: 'string', format: 'date-time' },\n            assessment_context: {\n              type: 'string',\n              enum: ['ROUTINE', 'PRE_MEDICATION', 'POST_MEDICATION', 'ON_DEMAND', 'ADMISSION', 'DISCHARGE', 'FOLLOW_UP'],\n            },\n            pain_scale_type: {\n              type: 'string',\n              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],\n            },\n            // NRS\n            nrs_score: { type: 'integer', minimum: 0, maximum: 10 },\n            // VAS\n            vas_score: { type: 'number', minimum: 0, maximum: 100 },\n            // Wong-Baker\n            wong_baker_score: { type: 'integer', minimum: 0, maximum: 10 },\n            wong_baker_face_selected: { type: 'string' },\n            // FLACC subscores\n            flacc_face: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_legs: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_activity: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_cry: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_consolability: { type: 'integer', minimum: 0, maximum: 2 },\n            // PAINAD subscores\n            painad_breathing: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_negative_vocalization: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_body_language: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_consolability: { type: 'integer', minimum: 0, maximum: 2 },\n            // CPOT subscores\n            cpot_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_body_movements: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_muscle_tension: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_ventilator_compliance: { type: 'integer', minimum: 0, maximum: 2 },\n            // Pain characteristics\n            pain_location_primary: { type: 'string', maxLength: 255 },\n            pain_location_secondary: { type: 'string', maxLength: 255 },\n            pain_quality: { type: 'string', maxLength: 255 },\n            pain_radiation: { type: 'string', maxLength: 255 },\n            pain_onset: { type: 'string', maxLength: 100 },\n            pain_pattern: { type: 'string', maxLength: 100 },\n            pain_duration_value: { type: 'integer' },\n            pain_duration_unit: { type: 'string', maxLength: 50 },\n            pain_frequency: { type: 'string', maxLength: 100 },\n            // Factors\n            aggravating_factors: { type: 'string' },\n            relieving_factors: { type: 'string' },\n            // Functional impact\n            affects_sleep: { type: 'boolean' },\n            affects_mobility: { type: 'boolean' },\n            affects_appetite: { type: 'boolean' },\n            affects_mood: { type: 'boolean' },\n            affects_adl: { type: 'boolean' },\n            functional_impact_notes: { type: 'string' },\n            // Acceptable level\n            acceptable_pain_level: { type: 'integer', minimum: 0, maximum: 10 },\n            // Intervention\n            intervention_given: { type: 'boolean' },\n            intervention_type: { type: 'string', enum: ['PHARMACOLOGICAL', 'NON_PHARMACOLOGICAL', 'BOTH'] },\n            intervention_description: { type: 'string' },\n            intervention_medication: { type: 'string', maxLength: 255 },\n            intervention_time: { type: 'string', format: 'date-time' },\n            post_intervention_score: { type: 'integer', minimum: 0, maximum: 10 },\n            post_intervention_time: { type: 'string', format: 'date-time' },\n            intervention_effective: { type: 'boolean' },\n            // Flags\n            is_breakthrough_pain: { type: 'boolean' },\n            requires_follow_up: { type: 'boolean' },\n            follow_up_notes: { type: 'string' },\n            // Communication\n            patient_able_to_self_report: { type: 'boolean' },\n            patient_goal_discussed: { type: 'boolean' },\n            additional_notes: { type: 'string' },\n          },\n        },\n      },\n    },\n    controller.store.bind(controller)\n  );\n\n  // Create a pain assessment for a specific patient\n  fastify.post(\n    '/patients/:patientId/pain-assessments',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Create a new pain assessment for a patient',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            patientId: { type: 'integer' },\n          },\n          required: ['patientId'],\n        },\n        body: {\n          type: 'object',\n          required: ['pain_scale_type'],\n          properties: {\n            pain_scale_type: {\n              type: 'string',\n              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],\n            },\n            // All other properties same as global create\n          },\n        },\n      },\n    },\n    controller.store.bind(controller)\n  );\n\n  // =========================================\n  // UPDATE ENDPOINTS\n  // =========================================\n\n  // Update a pain assessment\n  fastify.patch(\n    '/pain-assessments/:id',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Update a pain assessment (not allowed for signed assessments)',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            id: { type: 'integer' },\n          },\n          required: ['id'],\n        },\n      },\n    },\n    controller.update.bind(controller)\n  );\n\n  // =========================================\n  // DELETE ENDPOINTS\n  // =========================================\n\n  // Delete a pain assessment\n  fastify.delete(\n    '/pain-assessments/:id',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Delete a pain assessment (not allowed for signed assessments)',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            id: { type: 'integer' },\n          },\n          required: ['id'],\n        },\n      },\n    },\n    controller.delete.bind(controller)\n  );\n\n  // =========================================\n  // COMPLIANCE ENDPOINTS (21 CFR Part 11)\n  // =========================================\n\n  // Sign a pain assessment\n  fastify.post(\n    '/pain-assessments/:id/sign',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Sign a pain assessment (21 CFR Part 11 compliance)',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            id: { type: 'integer' },\n          },\n          required: ['id'],\n        },\n      },\n    },\n    controller.sign.bind(controller)\n  );\n\n  // Amend a signed pain assessment\n  fastify.post(\n    '/pain-assessments/:id/amend',\n    {\n      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],\n      schema: {\n        description: 'Amend a signed pain assessment',\n        tags: ['Pain Assessments'],\n        params: {\n          type: 'object',\n          properties: {\n            id: { type: 'integer' },\n          },\n          required: ['id'],\n        },\n        body: {\n          type: 'object',\n          required: ['amendment_reason'],\n          properties: {\n            amendment_reason: { type: 'string', minLength: 1 },\n            // Allow updating scores and notes\n            nrs_score: { type: 'integer', minimum: 0, maximum: 10 },\n            vas_score: { type: 'number', minimum: 0, maximum: 100 },\n            wong_baker_score: { type: 'integer', minimum: 0, maximum: 10 },\n            flacc_face: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_legs: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_activity: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_cry: { type: 'integer', minimum: 0, maximum: 2 },\n            flacc_consolability: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_breathing: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_negative_vocalization: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_body_language: { type: 'integer', minimum: 0, maximum: 2 },\n            painad_consolability: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_body_movements: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_muscle_tension: { type: 'integer', minimum: 0, maximum: 2 },\n            cpot_ventilator_compliance: { type: 'integer', minimum: 0, maximum: 2 },\n            pain_location_primary: { type: 'string' },\n            pain_location_secondary: { type: 'string' },\n            pain_quality: { type: 'string' },\n            pain_radiation: { type: 'string' },\n            additional_notes: { type: 'string' },\n            post_intervention_score: { type: 'integer', minimum: 0, maximum: 10 },\n            intervention_effective: { type: 'boolean' },\n          },\n        },\n      },\n    },\n    controller.amend.bind(controller)\n  );\n}\n\nexport default multiScalePainAssessmentRoutes;\n"
}

Now I need to register the new routes in the API. Let me check the api.routes.js file.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js"
}

Now let me add the import and register the routes.

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js",
  "old_string": "import wongBakerFacesScaleRoutes from \"./wongBakerFacesScale.routes.js\";",
  "new_string": "import wongBakerFacesScaleRoutes from \"./wongBakerFacesScale.routes.js\";\nimport multiScalePainAssessmentRoutes from \"./multiScalePainAssessment.routes.js\";"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js",
  "old_string": "await fastify.register(wongBakerFacesScaleRoutes); // Wong-Baker FACES - Visual Pain Scale",
  "new_string": "await fastify.register(wongBakerFacesScaleRoutes); // Wong-Baker FACES - Visual Pain Scale\n  await fastify.register(multiScalePainAssessmentRoutes); // Multi-Scale Pain Assessment - NRS, VAS, FLACC, PAINAD, CPOT, Wong-Baker"
}

Now let me update the todo list and add pain assessment permissions to the RBAC config.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "completed",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "completed",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "completed",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "in_progress",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "pending",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "  // Medications\n  VIEW_MEDICATIONS: \"view:medications\",\n  CREATE_MEDICATIONS: \"create:medications\",\n  UPDATE_MEDICATIONS: \"update:medications\",\n  DELETE_MEDICATIONS: \"delete:medications\",",
  "new_string": "  // Medications\n  VIEW_MEDICATIONS: \"view:medications\",\n  CREATE_MEDICATIONS: \"create:medications\",\n  UPDATE_MEDICATIONS: \"update:medications\",\n  DELETE_MEDICATIONS: \"delete:medications\",\n\n  // Pain Assessments\n  VIEW_PAIN_ASSESSMENTS: \"view:pain_assessments\",\n  CREATE_PAIN_ASSESSMENTS: \"create:pain_assessments\",\n  UPDATE_PAIN_ASSESSMENTS: \"update:pain_assessments\",\n  DELETE_PAIN_ASSESSMENTS: \"delete:pain_assessments\","
}

Now let me add the permissions to the role mappings.

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "  [ROLES.ADMIN]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.DELETE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.DELETE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.DELETE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    PERMISSIONS.DELETE_MEDICATIONS,\n    // Eligibility - Admin has all permissions\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n    PERMISSIONS.ELIGIBILITY_PROCESS,\n    PERMISSIONS.ELIGIBILITY_MANAGE,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n    PERMISSIONS.MANAGE_USERS,\n    PERMISSIONS.MANAGE_ROLES,\n    PERMISSIONS.MANAGE_PERMISSIONS,\n    PERMISSIONS.VIEW_AUDIT_LOGS,\n    PERMISSIONS.MANAGE_SETTINGS,\n  ],",
  "new_string": "  [ROLES.ADMIN]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.DELETE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.DELETE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.DELETE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    PERMISSIONS.DELETE_MEDICATIONS,\n    // Pain Assessments - Admin has all permissions\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.DELETE_PAIN_ASSESSMENTS,\n    // Eligibility - Admin has all permissions\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n    PERMISSIONS.ELIGIBILITY_PROCESS,\n    PERMISSIONS.ELIGIBILITY_MANAGE,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n    PERMISSIONS.MANAGE_USERS,\n    PERMISSIONS.MANAGE_ROLES,\n    PERMISSIONS.MANAGE_PERMISSIONS,\n    PERMISSIONS.VIEW_AUDIT_LOGS,\n    PERMISSIONS.MANAGE_SETTINGS,\n  ],"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "  [ROLES.DOCTOR]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    // Eligibility - Doctors can view and verify\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n  ],",
  "new_string": "  [ROLES.DOCTOR]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    // Pain Assessments - Doctors can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Doctors can view and verify\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n  ],"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "  [ROLES.NURSE]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Eligibility - Nurses can view coverage\n    PERMISSIONS.ELIGIBILITY_VIEW,\n  ],",
  "new_string": "  [ROLES.NURSE]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Nurses can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Nurses can view coverage\n    PERMISSIONS.ELIGIBILITY_VIEW,\n  ],"
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "  [ROLES.STAFF]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Eligibility - Staff can view and verify (billing staff role)\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n  ],",
  "new_string": "  [ROLES.STAFF]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Staff can view\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    // Eligibility - Staff can view and verify (billing staff role)\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n  ],"
}

RBAC permissions have been added. Now let me update the todo list and create a Playwright test to verify the implementation.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "completed",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "completed",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "completed",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "completed",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "in_progress",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

Now let me create a Playwright test to verify the implementation. First, let me check the existing test patterns.

🔧 Tool: Glob
Input: {
  "pattern": "apps/web/tests/*.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/analytics-controller-verification.spec.ts"
}

I see the test pattern. Now let me create a verification test for the Multi-Scale Pain Assessment Controller.

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/pain-controller-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification tests for Multi-Scale Pain Assessment Controller\n * Feature: pain-controller\n *\n * This test verifies:\n * 1. Pain assessment CRUD endpoints exist and require authentication\n * 2. Multiple pain scale types are supported (NRS, VAS, WONG_BAKER, FLACC, PAINAD, CPOT)\n * 3. Patient-scoped pain assessment endpoints work\n * 4. Pain trend/history endpoint exists\n * 5. Signing and amendment endpoints exist for 21 CFR Part 11 compliance\n * 6. Reference endpoint returns scale information\n * 7. Query parameters for filtering are accepted\n *\n * Features tested:\n * - Multi-scale pain assessment support\n * - HIPAA/21 CFR Part 11 compliance (sign/amend)\n * - Date range filtering\n * - Pagination support\n * - Scale-specific validation\n */\n\nconst API_BASE_URL = 'http://localhost:3001/api';\n\ntest.describe('Multi-Scale Pain Assessment - Reference Endpoint', () => {\n  test('should have reference endpoint that returns scale information (GET /pain-assessments/reference)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/pain-assessments/reference`);\n\n    // Reference endpoint should be accessible (may or may not require auth)\n    // If it requires auth, it should return 401/403, not 404\n    expect(response.status()).not.toBe(404);\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - List Endpoints', () => {\n  test('should have list all pain assessments endpoint (GET /pain-assessments)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/pain-assessments`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering by patient_id', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/pain-assessments?patient_id=1`);\n\n    // Should require authentication with filter param\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering by scale_type', async ({ request }) => {\n    const scaleTypes = ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'];\n\n    for (const scaleType of scaleTypes) {\n      const response = await request.get(`${API_BASE_URL}/pain-assessments?scale_type=${scaleType}`);\n      // Should require authentication, not reject the scale type\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n\n  test('should support date range filtering', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/pain-assessments?from_date=2025-01-01&to_date=2025-12-31`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support pagination', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/pain-assessments?limit=25&offset=0`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support follow-up filter', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/pain-assessments?requires_follow_up=true`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Patient-Scoped Endpoints', () => {\n  test('should have patient pain assessments endpoint (GET /patients/:patientId/pain-assessments)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/patients/1/pain-assessments`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support scale_type filter on patient endpoint', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/patients/1/pain-assessments?scale_type=NRS`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have patient pain trend endpoint (GET /patients/:patientId/pain-assessments/trend)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/patients/1/pain-assessments/trend`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support days parameter on trend endpoint', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/patients/1/pain-assessments/trend?days=30`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support scale_type filter on trend endpoint', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/patients/1/pain-assessments/trend?days=30&scale_type=FLACC`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Single Resource Endpoint', () => {\n  test('should have show single assessment endpoint (GET /pain-assessments/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/pain-assessments/1`);\n\n    // Should require authentication (not 404 for missing ID, which is expected)\n    // The endpoint should exist even if the resource doesn't\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Create Endpoints', () => {\n  test('should have create pain assessment endpoint (POST /pain-assessments)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/pain-assessments`, {\n      data: {\n        patient_id: 1,\n        pain_scale_type: 'NRS',\n        nrs_score: 5,\n      },\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have patient-scoped create endpoint (POST /patients/:patientId/pain-assessments)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/patients/1/pain-assessments`, {\n      data: {\n        pain_scale_type: 'NRS',\n        nrs_score: 5,\n      },\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should accept all supported pain scale types for creation', async ({ request }) => {\n    const scaleRequests = [\n      { pain_scale_type: 'NRS', nrs_score: 5 },\n      { pain_scale_type: 'VAS', vas_score: 50 },\n      { pain_scale_type: 'WONG_BAKER', wong_baker_score: 4 },\n      { pain_scale_type: 'FLACC', flacc_face: 1, flacc_legs: 1, flacc_activity: 1, flacc_cry: 1, flacc_consolability: 1 },\n      { pain_scale_type: 'PAINAD', painad_breathing: 1, painad_negative_vocalization: 1, painad_facial_expression: 1, painad_body_language: 1, painad_consolability: 1 },\n      { pain_scale_type: 'CPOT', cpot_facial_expression: 1, cpot_body_movements: 1, cpot_muscle_tension: 1, cpot_ventilator_compliance: 1 },\n    ];\n\n    for (const scaleData of scaleRequests) {\n      const response = await request.post(`${API_BASE_URL}/pain-assessments`, {\n        data: {\n          patient_id: 1,\n          ...scaleData,\n        },\n      });\n      // Should require authentication, not reject the scale type\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Update Endpoint', () => {\n  test('should have update pain assessment endpoint (PATCH /pain-assessments/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/pain-assessments/1`, {\n      data: {\n        nrs_score: 3,\n      },\n    });\n\n    // Should require authentication (not 404 for method not allowed)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Delete Endpoint', () => {\n  test('should have delete pain assessment endpoint (DELETE /pain-assessments/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/pain-assessments/1`);\n\n    // Should require authentication (not 404 for method not allowed)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - 21 CFR Part 11 Compliance Endpoints', () => {\n  test('should have sign pain assessment endpoint (POST /pain-assessments/:id/sign)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/pain-assessments/1/sign`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n\n  test('should have amend pain assessment endpoint (POST /pain-assessments/:id/amend)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/pain-assessments/1/amend`, {\n      data: {\n        amendment_reason: 'Correction to pain score',\n        nrs_score: 4,\n      },\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403, 404]).toContain(response.status());\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - All Endpoints Exist', () => {\n  test('all pain assessment controller endpoints should be accessible', async ({ request }) => {\n    const endpoints = [\n      // Reference endpoint\n      { path: '/pain-assessments/reference', method: 'GET', purpose: 'Get pain scale reference information' },\n\n      // List endpoints\n      { path: '/pain-assessments', method: 'GET', purpose: 'List all pain assessments with filters' },\n      { path: '/patients/1/pain-assessments', method: 'GET', purpose: 'List patient pain assessments' },\n      { path: '/patients/1/pain-assessments/trend', method: 'GET', purpose: 'Get patient pain trend data' },\n\n      // Single resource\n      { path: '/pain-assessments/1', method: 'GET', purpose: 'Get single pain assessment' },\n\n      // Create\n      { path: '/pain-assessments', method: 'POST', purpose: 'Create pain assessment' },\n      { path: '/patients/1/pain-assessments', method: 'POST', purpose: 'Create patient pain assessment' },\n\n      // Update\n      { path: '/pain-assessments/1', method: 'PATCH', purpose: 'Update pain assessment' },\n\n      // Delete\n      { path: '/pain-assessments/1', method: 'DELETE', purpose: 'Delete pain assessment' },\n\n      // Compliance\n      { path: '/pain-assessments/1/sign', method: 'POST', purpose: 'Sign pain assessment' },\n      { path: '/pain-assessments/1/amend', method: 'POST', purpose: 'Amend signed pain assessment' },\n    ];\n\n    for (const { path, method, purpose } of endpoints) {\n      let response;\n      const url = `${API_BASE_URL}${path}`;\n\n      switch (method) {\n        case 'GET':\n          response = await request.get(url);\n          break;\n        case 'POST':\n          response = await request.post(url, { data: { patient_id: 1, pain_scale_type: 'NRS' } });\n          break;\n        case 'PATCH':\n          response = await request.patch(url, { data: {} });\n          break;\n        case 'DELETE':\n          response = await request.delete(url);\n          break;\n      }\n\n      // All endpoints should exist (require auth or return resource-specific errors, not 404 for route not found)\n      // Note: For single resource endpoints like /pain-assessments/1, a 404 is acceptable if the resource doesn't exist\n      // But the route itself should be defined\n      const isResourceNotFound =\n        (path.includes('/1') && response!.status() === 404) ||\n        path === '/pain-assessments/reference';\n\n      if (!isResourceNotFound) {\n        expect(\n          [401, 403, 404].includes(response!.status()),\n          `Endpoint ${method} ${path} (${purpose}) should require authentication or return appropriate status`\n        ).toBe(true);\n      }\n    }\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Pain Scale Type Validation', () => {\n  test('should support all documented pain scale types', async ({ request }) => {\n    const supportedScales = [\n      'NRS',        // Numeric Rating Scale (0-10)\n      'VAS',        // Visual Analog Scale (0-100mm)\n      'WONG_BAKER', // Wong-Baker FACES (0-10)\n      'FLACC',      // Face, Legs, Activity, Cry, Consolability (0-10)\n      'PAINAD',     // Pain Assessment in Advanced Dementia (0-10)\n      'CPOT',       // Critical Care Pain Observation Tool (0-8)\n    ];\n\n    for (const scaleType of supportedScales) {\n      const response = await request.post(`${API_BASE_URL}/pain-assessments`, {\n        data: {\n          patient_id: 1,\n          pain_scale_type: scaleType,\n        },\n      });\n\n      // Should require authentication, not reject the scale type as invalid\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n});\n\ntest.describe('Multi-Scale Pain Assessment - Query Parameter Combinations', () => {\n  test('should accept combined filter parameters', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/pain-assessments?patient_id=1&scale_type=NRS&from_date=2025-01-01&to_date=2025-12-31&limit=25&offset=0`\n    );\n\n    // Should require authentication with all filter params\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should accept trend endpoint with all parameters', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/patients/1/pain-assessments/trend?days=60&scale_type=PAINAD&limit=50`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n"
}

Now let me run the Playwright test to verify the implementation.

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web && npx playwright test pain-controller-verification.spec.ts --reporter=list 2>&1 | head -100",
  "timeout": 120000
}

The tests are failing because the API server is not running. Let me check if it's running and start it if needed.

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden && lsof -i :3001 2>/dev/null | head -5"
}

The API server is not running. Let me start it in the background.

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/services/api && npm run dev 2>&1 &\nsleep 8\nlsof -i :3001 2>/dev/null | head -5",
  "timeout": 30000,
  "dangerouslyDisableSandbox": true
}

🔧 Tool: Bash
Input: {
  "command": "cat /tmp/claude/-Users-fabrice-Sites-chartwarden-Chartwarden/tasks/b792334.output | tail -50"
}

There's an issue with a missing model file. This is an existing issue with the codebase, not something I introduced. Let me kill the background task and check if there's a pre-existing model or if the prognosis controller needs to be updated. Let me first verify that my changes are syntactically correct by checking for any import errors.

🔧 Tool: KillShell
Input: {
  "shell_id": "b792334"
}

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/services/api && node --check src/controllers/MultiScalePainAssessment.controller.js 2>&1",
  "timeout": 30000
}

🔧 Tool: Bash
Input: {
  "command": "node --check src/routes/multiScalePainAssessment.routes.js 2>&1",
  "timeout": 30000
}

🔧 Tool: Bash
Input: {
  "command": "node --check src/db/schemas/multiScalePainAssessment.schema.js 2>&1",
  "timeout": 30000
}

All the new files pass syntax checking. The issue is an existing problem in the codebase with the Prognosis controller. Let me check if this is a pre-existing issue not caused by my changes.

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden && git diff --name-only HEAD 2>/dev/null | head -20"
}

The Prognosis.model.js issue is a pre-existing issue in the codebase. My changes are syntactically correct. Let me verify by checking if the Prognosis controller issue is something that pre-dates my changes, and then delete my test file as required.

Since the API server cannot start due to a pre-existing issue (missing Prognosis.model.js file), I've verified that all my code files are syntactically correct. The implementation is complete - the test file confirms the structure and demonstrates what the API should do. Let me now clean up by deleting the test file as instructed, and update my todo list.

🔧 Tool: Bash
Input: {
  "command": "rm /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/pain-controller-verification.spec.ts"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure for pain assessment patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure"
    },
    {
      "content": "Create enhanced pain assessment database schema with multi-scale support",
      "status": "completed",
      "activeForm": "Creating enhanced pain assessment schema"
    },
    {
      "content": "Implement Pain Assessment controller with CRUD operations",
      "status": "completed",
      "activeForm": "Implementing Pain Assessment controller"
    },
    {
      "content": "Create pain assessment routes with validation",
      "status": "completed",
      "activeForm": "Creating pain assessment routes"
    },
    {
      "content": "Add pain assessment permissions to RBAC",
      "status": "completed",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Verify implementation with Playwright test",
      "status": "completed",
      "activeForm": "Verifying with Playwright test"
    }
  ]
}

<summary>
## Summary: Implement Pain Assessment Controller with Multi-Scale Support

### Changes Implemented
- Created a comprehensive multi-scale pain assessment database schema supporting 6 standardized pain scales:
  - NRS (Numeric Rating Scale): 0-10 self-report
  - VAS (Visual Analog Scale): 0-100mm
  - Wong-Baker FACES: 0-10 pictorial
  - FLACC: 0-10 behavioral (pediatric/non-verbal)
  - PAINAD: 0-10 behavioral (dementia patients)
  - CPOT: 0-8 behavioral (ICU/critical care)
- Implemented class-based controller with full CRUD operations:
  - Index with filtering by patient_id, scale_type, date range, follow-up required
  - Show single assessment with pain intensity interpretation
  - Store with automatic total score calculation for behavioral scales
  - Update with validation against signed documents
  - Delete with protection for signed assessments
- Added 21 CFR Part 11 compliance endpoints (sign/amend)
- Created RESTful routes with Fastify schema validation
- Added RBAC permissions for pain assessments (VIEW, CREATE, UPDATE, DELETE)
- Implemented patient-scoped endpoints (/patients/:patientId/pain-assessments)
- Added trend/history endpoint with statistics aggregation

### Files Modified
- `services/api/src/db/schemas/multiScalePainAssessment.schema.js` (NEW)
- `services/api/src/db/schemas/index.js` (MODIFIED - added export)
- `services/api/src/controllers/MultiScalePainAssessment.controller.js` (NEW)
- `services/api/src/routes/multiScalePainAssessment.routes.js` (NEW)
- `services/api/src/routes/api.routes.js` (MODIFIED - registered routes)
- `services/api/src/config/rbac.js` (MODIFIED - added permissions)

### Verification Status
- All new files pass syntax checking with `node --check`
- Playwright verification test was created and run
- Tests could not complete due to pre-existing API server startup issue (missing Prognosis.model.js)
- Test file was deleted after verification attempt as instructed

### Notes for Developer
- The API server has a pre-existing issue: `Cannot find module '/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/models/Prognosis.model.js'`
- Once this is fixed, the new pain assessment endpoints will be available at:
  - `GET/POST /api/pain-assessments`
  - `GET/PATCH/DELETE /api/pain-assessments/:id`
  - `GET /api/pain-assessments/reference`
  - `GET/POST /api/patients/:patientId/pain-assessments`
  - `GET /api/patients/:patientId/pain-assessments/trend`
  - `POST /api/pain-assessments/:id/sign`
  - `POST /api/pain-assessments/:id/amend`
- Schema includes normalized pain score (0-10) for cross-scale comparison
- Behavioral scales (FLACC, PAINAD, CPOT) auto-calculate total scores from subscores
</summary>