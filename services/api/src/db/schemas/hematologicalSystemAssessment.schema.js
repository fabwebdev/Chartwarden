import { pgTable, bigint, integer, varchar, decimal, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Hematological System Assessment Schema
 * Comprehensive blood and coagulation assessment for hospice patients
 *
 * Clinical Parameters:
 * - Complete blood count (CBC) components
 * - Coagulation factors and clotting assessment
 * - Anemia evaluation and classification
 * - Bleeding/bruising assessment
 * - Lymphatic system evaluation
 * - Transfusion history
 *
 * Reference Standards:
 * - American Society of Hematology guidelines
 * - WHO anemia classification
 * - Common lab reference ranges
 */
export const hematological_system_assessments = pgTable('hematological_system_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, ROUTINE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL HEMATOLOGICAL STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // NORMAL, ABNORMAL, UNCHANGED, IMPROVED, DECLINED
  hematological_history: text('hematological_history'),
  known_conditions: jsonb('known_conditions'), // Array: ANEMIA, LEUKEMIA, LYMPHOMA, THROMBOCYTOPENIA, DVT, etc.
  blood_type: varchar('blood_type', { length: 10 }), // A+, A-, B+, B-, AB+, AB-, O+, O-

  // =========================================
  // COMPLETE BLOOD COUNT (CBC)
  // =========================================
  // White Blood Cells
  wbc_count: decimal('wbc_count', { precision: 6, scale: 2 }), // x10^9/L or K/uL
  wbc_unit: varchar('wbc_unit', { length: 20 }).default('K/uL'),
  wbc_status: varchar('wbc_status', { length: 50 }), // NORMAL, LEUKOCYTOSIS, LEUKOPENIA, NEUTROPENIA

  // WBC Differential
  neutrophils_percent: decimal('neutrophils_percent', { precision: 5, scale: 2 }),
  neutrophils_absolute: decimal('neutrophils_absolute', { precision: 6, scale: 2 }), // ANC
  lymphocytes_percent: decimal('lymphocytes_percent', { precision: 5, scale: 2 }),
  lymphocytes_absolute: decimal('lymphocytes_absolute', { precision: 6, scale: 2 }),
  monocytes_percent: decimal('monocytes_percent', { precision: 5, scale: 2 }),
  eosinophils_percent: decimal('eosinophils_percent', { precision: 5, scale: 2 }),
  basophils_percent: decimal('basophils_percent', { precision: 5, scale: 2 }),
  bands_percent: decimal('bands_percent', { precision: 5, scale: 2 }),

  // Red Blood Cells
  rbc_count: decimal('rbc_count', { precision: 5, scale: 2 }), // x10^12/L or M/uL
  rbc_unit: varchar('rbc_unit', { length: 20 }).default('M/uL'),
  hemoglobin: decimal('hemoglobin', { precision: 5, scale: 1 }), // g/dL
  hematocrit: decimal('hematocrit', { precision: 5, scale: 1 }), // %
  rbc_status: varchar('rbc_status', { length: 50 }), // NORMAL, ANEMIA, POLYCYTHEMIA

  // RBC Indices
  mcv: decimal('mcv', { precision: 5, scale: 1 }), // fL - Mean Corpuscular Volume
  mch: decimal('mch', { precision: 5, scale: 1 }), // pg - Mean Corpuscular Hemoglobin
  mchc: decimal('mchc', { precision: 5, scale: 1 }), // g/dL - Mean Corpuscular Hemoglobin Concentration
  rdw: decimal('rdw', { precision: 5, scale: 1 }), // % - Red Cell Distribution Width
  reticulocyte_count: decimal('reticulocyte_count', { precision: 5, scale: 2 }), // %

  // Platelets
  platelet_count: decimal('platelet_count', { precision: 7, scale: 0 }), // K/uL
  platelet_unit: varchar('platelet_unit', { length: 20 }).default('K/uL'),
  platelet_status: varchar('platelet_status', { length: 50 }), // NORMAL, THROMBOCYTOPENIA, THROMBOCYTOSIS
  mpv: decimal('mpv', { precision: 4, scale: 1 }), // fL - Mean Platelet Volume

  cbc_date: timestamp('cbc_date'),
  cbc_notes: text('cbc_notes'),

  // =========================================
  // ANEMIA ASSESSMENT
  // =========================================
  anemia_present: boolean('anemia_present').default(false),
  anemia_severity: varchar('anemia_severity', { length: 50 }), // MILD, MODERATE, SEVERE (WHO classification)
  anemia_type: varchar('anemia_type', { length: 100 }), // IRON_DEFICIENCY, B12_DEFICIENCY, FOLATE_DEFICIENCY, CHRONIC_DISEASE, HEMOLYTIC, APLASTIC
  anemia_morphology: varchar('anemia_morphology', { length: 50 }), // MICROCYTIC, NORMOCYTIC, MACROCYTIC

  // Anemia symptoms
  fatigue_present: boolean('fatigue_present').default(false),
  fatigue_severity: varchar('fatigue_severity', { length: 50 }), // MILD, MODERATE, SEVERE
  weakness: boolean('weakness').default(false),
  shortness_of_breath: boolean('shortness_of_breath').default(false),
  dizziness: boolean('dizziness').default(false),
  pallor_present: boolean('pallor_present').default(false),
  pallor_location: jsonb('pallor_location'), // Array: CONJUNCTIVA, NAIL_BEDS, PALMS, ORAL_MUCOSA
  pica_present: boolean('pica_present').default(false),
  glossitis: boolean('glossitis').default(false),
  koilonychia: boolean('koilonychia').default(false), // Spoon nails
  angular_cheilitis: boolean('angular_cheilitis').default(false),
  tachycardia_related: boolean('tachycardia_related').default(false),
  anemia_notes: text('anemia_notes'),

  // Iron studies
  serum_iron: decimal('serum_iron', { precision: 5, scale: 0 }), // mcg/dL
  tibc: decimal('tibc', { precision: 5, scale: 0 }), // mcg/dL - Total Iron Binding Capacity
  transferrin_saturation: decimal('transferrin_saturation', { precision: 5, scale: 1 }), // %
  ferritin: decimal('ferritin', { precision: 7, scale: 1 }), // ng/mL
  iron_studies_date: timestamp('iron_studies_date'),

  // B12 and Folate
  vitamin_b12: decimal('vitamin_b12', { precision: 7, scale: 0 }), // pg/mL
  folate: decimal('folate', { precision: 6, scale: 1 }), // ng/mL
  b12_folate_date: timestamp('b12_folate_date'),

  // =========================================
  // COAGULATION ASSESSMENT
  // =========================================
  // Coagulation tests
  pt: decimal('pt', { precision: 5, scale: 1 }), // seconds - Prothrombin Time
  inr: decimal('inr', { precision: 4, scale: 2 }), // International Normalized Ratio
  ptt: decimal('ptt', { precision: 5, scale: 1 }), // seconds - Partial Thromboplastin Time
  aptt: decimal('aptt', { precision: 5, scale: 1 }), // seconds - Activated PTT
  fibrinogen: decimal('fibrinogen', { precision: 5, scale: 0 }), // mg/dL
  d_dimer: decimal('d_dimer', { precision: 6, scale: 2 }), // ng/mL or mcg/mL FEU
  coagulation_date: timestamp('coagulation_date'),
  coagulation_status: varchar('coagulation_status', { length: 50 }), // NORMAL, PROLONGED, HYPERCOAGULABLE

  // Anticoagulation therapy
  on_anticoagulation: boolean('on_anticoagulation').default(false),
  anticoagulant_type: varchar('anticoagulant_type', { length: 100 }), // WARFARIN, HEPARIN, LOVENOX, XARELTO, ELIQUIS, PRADAXA
  anticoagulant_indication: varchar('anticoagulant_indication', { length: 255 }), // AFib, DVT, PE, MECHANICAL_VALVE, etc.
  inr_target_low: decimal('inr_target_low', { precision: 3, scale: 1 }),
  inr_target_high: decimal('inr_target_high', { precision: 3, scale: 1 }),
  inr_in_range: boolean('inr_in_range'),
  anticoagulation_notes: text('anticoagulation_notes'),

  // =========================================
  // BLEEDING ASSESSMENT
  // =========================================
  active_bleeding: boolean('active_bleeding').default(false),
  bleeding_sites: jsonb('bleeding_sites'), // Array: GINGIVAL, NASAL, GI, GU, SKIN, INJECTION_SITES, etc.
  bleeding_severity: varchar('bleeding_severity', { length: 50 }), // MINOR, MODERATE, MAJOR, LIFE_THREATENING
  bleeding_description: text('bleeding_description'),

  bruising_present: boolean('bruising_present').default(false),
  bruising_extent: varchar('bruising_extent', { length: 50 }), // MINIMAL, MODERATE, EXTENSIVE
  bruising_locations: jsonb('bruising_locations'), // Array of locations
  bruising_unexplained: boolean('bruising_unexplained').default(false),

  petechiae_present: boolean('petechiae_present').default(false),
  petechiae_locations: jsonb('petechiae_locations'),
  ecchymosis_present: boolean('ecchymosis_present').default(false),
  hematoma_present: boolean('hematoma_present').default(false),
  hematoma_locations: text('hematoma_locations'),

  bleeding_history: text('bleeding_history'),
  bleeding_notes: text('bleeding_notes'),

  // =========================================
  // CLOTTING/THROMBOSIS RISK
  // =========================================
  dvt_history: boolean('dvt_history').default(false),
  pe_history: boolean('pe_history').default(false),
  current_dvt_pe: boolean('current_dvt_pe').default(false),
  thrombosis_location: varchar('thrombosis_location', { length: 255 }),
  thrombosis_date: timestamp('thrombosis_date'),

  // DVT/PE risk factors
  immobility: boolean('immobility').default(false),
  recent_surgery: boolean('recent_surgery').default(false),
  malignancy_active: boolean('malignancy_active').default(false),
  central_line_present: boolean('central_line_present').default(false),
  thrombophilia: boolean('thrombophilia').default(false),
  thrombophilia_type: varchar('thrombophilia_type', { length: 255 }),

  // Lower extremity assessment for DVT
  leg_swelling: boolean('leg_swelling').default(false),
  leg_swelling_side: varchar('leg_swelling_side', { length: 20 }), // LEFT, RIGHT, BILATERAL
  leg_pain: boolean('leg_pain').default(false),
  leg_warmth: boolean('leg_warmth').default(false),
  leg_redness: boolean('leg_redness').default(false),
  calf_tenderness: boolean('calf_tenderness').default(false),
  homans_sign: boolean('homans_sign').default(false),
  calf_circumference_right: decimal('calf_circumference_right', { precision: 5, scale: 1 }), // cm
  calf_circumference_left: decimal('calf_circumference_left', { precision: 5, scale: 1 }), // cm

  thrombosis_notes: text('thrombosis_notes'),

  // =========================================
  // LYMPHATIC SYSTEM
  // =========================================
  lymphadenopathy_present: boolean('lymphadenopathy_present').default(false),
  lymph_node_locations: jsonb('lymph_node_locations'), // Array: CERVICAL, AXILLARY, INGUINAL, SUPRACLAVICULAR, etc.
  lymph_node_characteristics: varchar('lymph_node_characteristics', { length: 255 }), // SOFT, FIRM, HARD, FIXED, MOBILE, TENDER
  lymph_node_size: varchar('lymph_node_size', { length: 100 }), // Size description
  splenomegaly: boolean('splenomegaly').default(false),
  spleen_size_cm: decimal('spleen_size_cm', { precision: 5, scale: 1 }), // cm below costal margin
  hepatomegaly: boolean('hepatomegaly').default(false),
  liver_span_cm: decimal('liver_span_cm', { precision: 5, scale: 1 }), // cm
  lymphatic_notes: text('lymphatic_notes'),

  // =========================================
  // TRANSFUSION HISTORY
  // =========================================
  transfusion_history: boolean('transfusion_history').default(false),
  last_transfusion_date: timestamp('last_transfusion_date'),
  last_transfusion_type: varchar('last_transfusion_type', { length: 100 }), // PRBC, PLATELETS, FFP, CRYOPRECIPITATE
  transfusion_reactions: boolean('transfusion_reactions').default(false),
  transfusion_reaction_type: text('transfusion_reaction_type'),
  blood_product_refusal: boolean('blood_product_refusal').default(false),
  refusal_reason: text('refusal_reason'),
  transfusion_notes: text('transfusion_notes'),

  // =========================================
  // CLINICAL NOTES AND SUMMARY
  // =========================================
  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),
  follow_up_plan: text('follow_up_plan'),
  provider_notified: boolean('provider_notified').default(false),
  provider_notified_reason: text('provider_notified_reason'),

  // =========================================
  // SIGNATURE AND COMPLIANCE (21 CFR Part 11)
  // =========================================
  signature_id: bigint('signature_id', { mode: 'number' }),
  signed_at: timestamp('signed_at'),
  signed_by_id: bigint('signed_by_id', { mode: 'number' }),

  // Amendment tracking
  amended: boolean('amended').default(false),
  amendment_reason: text('amendment_reason'),
  amended_at: timestamp('amended_at'),
  amended_by_id: bigint('amended_by_id', { mode: 'number' }),

  // =========================================
  // AUDIT FIELDS
  // =========================================
  created_by_id: bigint('created_by_id', { mode: 'number' }),
  updated_by_id: bigint('updated_by_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes
  patientIdx: index('idx_hematological_system_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_hematological_system_assessments_date').on(table.assessment_date),
  patientDateIdx: index('idx_hematological_system_assessments_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_hematological_system_assessments_status').on(table.overall_status),
  anemiaIdx: index('idx_hematological_system_assessments_anemia').on(table.anemia_present),
  anticoagIdx: index('idx_hematological_system_assessments_anticoag').on(table.on_anticoagulation),
}));

// Blood types
export const HEMATOLOGICAL_BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Anemia severity (WHO classification)
export const HEMATOLOGICAL_ANEMIA_SEVERITY = {
  MILD: { hemoglobin: { min: 11.0, max: 12.9 }, label: 'Mild (Hgb 11.0-12.9 g/dL)' },
  MODERATE: { hemoglobin: { min: 8.0, max: 10.9 }, label: 'Moderate (Hgb 8.0-10.9 g/dL)' },
  SEVERE: { hemoglobin: { max: 8.0 }, label: 'Severe (Hgb <8.0 g/dL)' }
};

// Anemia types
export const HEMATOLOGICAL_ANEMIA_TYPES = {
  IRON_DEFICIENCY: 'IRON_DEFICIENCY',
  B12_DEFICIENCY: 'B12_DEFICIENCY',
  FOLATE_DEFICIENCY: 'FOLATE_DEFICIENCY',
  CHRONIC_DISEASE: 'CHRONIC_DISEASE',
  HEMOLYTIC: 'HEMOLYTIC',
  APLASTIC: 'APLASTIC',
  SICKLE_CELL: 'SICKLE_CELL',
  THALASSEMIA: 'THALASSEMIA',
  MYELODYSPLASTIC: 'MYELODYSPLASTIC'
};

// Common hematological conditions
export const HEMATOLOGICAL_CONDITIONS = [
  'IRON_DEFICIENCY_ANEMIA',
  'PERNICIOUS_ANEMIA',
  'SICKLE_CELL_DISEASE',
  'THALASSEMIA',
  'LEUKEMIA',
  'LYMPHOMA',
  'MULTIPLE_MYELOMA',
  'POLYCYTHEMIA_VERA',
  'THROMBOCYTOPENIA',
  'THROMBOCYTOSIS',
  'ITP',
  'TTP',
  'DIC',
  'HEMOPHILIA',
  'VON_WILLEBRAND',
  'DEEP_VEIN_THROMBOSIS',
  'PULMONARY_EMBOLISM',
  'MYELODYSPLASTIC_SYNDROME',
  'APLASTIC_ANEMIA'
];

// Bleeding sites
export const HEMATOLOGICAL_BLEEDING_SITES = [
  'GINGIVAL',
  'NASAL',
  'GI_UPPER',
  'GI_LOWER',
  'GENITOURINARY',
  'VAGINAL',
  'SKIN',
  'INJECTION_SITES',
  'SURGICAL_SITE',
  'INTRACRANIAL',
  'RETROPERITONEAL',
  'JOINT'
];

// Lymph node locations
export const HEMATOLOGICAL_LYMPH_NODE_LOCATIONS = [
  'CERVICAL_ANTERIOR',
  'CERVICAL_POSTERIOR',
  'SUPRACLAVICULAR',
  'AXILLARY',
  'EPITROCHLEAR',
  'INGUINAL',
  'FEMORAL',
  'POPLITEAL',
  'SUBMANDIBULAR',
  'SUBMENTAL',
  'PREAURICULAR',
  'POSTAURICULAR',
  'OCCIPITAL'
];

// CBC normal ranges (adult)
export const HEMATOLOGICAL_CBC_RANGES = {
  wbc: { low: 4.5, high: 11.0, unit: 'K/uL', critical_low: 2.0, critical_high: 30.0 },
  rbc_male: { low: 4.5, high: 5.5, unit: 'M/uL' },
  rbc_female: { low: 4.0, high: 5.0, unit: 'M/uL' },
  hemoglobin_male: { low: 13.5, high: 17.5, unit: 'g/dL', critical_low: 7.0 },
  hemoglobin_female: { low: 12.0, high: 16.0, unit: 'g/dL', critical_low: 7.0 },
  hematocrit_male: { low: 38.8, high: 50.0, unit: '%' },
  hematocrit_female: { low: 34.9, high: 44.5, unit: '%' },
  platelets: { low: 150, high: 400, unit: 'K/uL', critical_low: 50, critical_high: 1000 },
  mcv: { low: 80, high: 100, unit: 'fL' },
  mch: { low: 27, high: 33, unit: 'pg' },
  mchc: { low: 32, high: 36, unit: 'g/dL' },
  rdw: { low: 11.5, high: 14.5, unit: '%' }
};

// Coagulation normal ranges
export const HEMATOLOGICAL_COAG_RANGES = {
  pt: { low: 11, high: 13.5, unit: 'seconds' },
  inr: { low: 0.9, high: 1.1, unit: 'ratio', therapeutic_low: 2.0, therapeutic_high: 3.0 },
  ptt: { low: 25, high: 35, unit: 'seconds' },
  fibrinogen: { low: 200, high: 400, unit: 'mg/dL' }
};

// Iron studies normal ranges
export const HEMATOLOGICAL_IRON_RANGES = {
  serum_iron: { low: 60, high: 170, unit: 'mcg/dL' },
  tibc: { low: 250, high: 370, unit: 'mcg/dL' },
  transferrin_sat: { low: 20, high: 50, unit: '%' },
  ferritin_male: { low: 30, high: 400, unit: 'ng/mL' },
  ferritin_female: { low: 15, high: 150, unit: 'ng/mL' }
};

// Pallor assessment locations
export const HEMATOLOGICAL_PALLOR_LOCATIONS = [
  'CONJUNCTIVA',
  'NAIL_BEDS',
  'PALMS',
  'ORAL_MUCOSA',
  'SKIN_GENERAL'
];
