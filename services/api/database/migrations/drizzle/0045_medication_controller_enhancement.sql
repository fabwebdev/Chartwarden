-- Migration: 0045_medication_controller_enhancement.sql
-- Description: Add patient allergies and drug interactions tables for medication safety

-- Patient Allergies Table
CREATE TABLE IF NOT EXISTS patient_allergies (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id),

  -- Allergy identification
  allergen_name VARCHAR(255) NOT NULL,
  allergen_type VARCHAR(50), -- MEDICATION, FOOD, ENVIRONMENTAL, OTHER
  allergen_code VARCHAR(50), -- RxNorm or other standard code

  -- Reaction details
  reaction_type VARCHAR(100), -- ANAPHYLAXIS, RASH, HIVES, SWELLING, GI_UPSET, OTHER
  reaction_severity VARCHAR(50), -- MILD, MODERATE, SEVERE, LIFE_THREATENING
  reaction_description TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, RESOLVED
  onset_date VARCHAR(50),
  verified_by_id TEXT REFERENCES "user"(id),
  verified_date TIMESTAMP,

  -- Source of information
  source VARCHAR(100), -- PATIENT_REPORTED, MEDICAL_RECORD, FAMILY_REPORTED

  -- Audit fields
  created_by_id TEXT REFERENCES "user"(id),
  updated_by_id TEXT REFERENCES "user"(id),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for patient_allergies
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id ON patient_allergies(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_allergen_name ON patient_allergies(allergen_name);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_status ON patient_allergies(status);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_status ON patient_allergies(patient_id, status);

-- Drug Interactions Table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id BIGSERIAL PRIMARY KEY,

  -- Drug pair
  drug1_name VARCHAR(255) NOT NULL,
  drug1_code VARCHAR(50), -- RxNorm or NDC
  drug2_name VARCHAR(255) NOT NULL,
  drug2_code VARCHAR(50), -- RxNorm or NDC

  -- Interaction details
  interaction_severity VARCHAR(50) NOT NULL, -- CONTRAINDICATED, SEVERE, MODERATE, MINOR
  interaction_description TEXT,
  clinical_effect TEXT,
  management_recommendation TEXT,

  -- Source
  source VARCHAR(100), -- FDA, MEDSCAPE, EPOCRATES, CUSTOM

  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for drug_interactions
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug1 ON drug_interactions(drug1_name);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drug2 ON drug_interactions(drug2_name);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_severity ON drug_interactions(interaction_severity);

-- Insert some common drug interactions for testing/demo purposes
INSERT INTO drug_interactions (drug1_name, drug2_name, interaction_severity, interaction_description, clinical_effect, management_recommendation, source) VALUES
('Warfarin', 'Aspirin', 'SEVERE', 'Increased risk of bleeding', 'Concurrent use increases risk of GI bleeding and hemorrhage', 'Monitor INR closely, consider alternative antiplatelet therapy', 'FDA'),
('Metformin', 'Contrast Dye', 'MODERATE', 'Risk of lactic acidosis', 'Iodinated contrast can cause acute kidney injury, reducing metformin clearance', 'Hold metformin 48 hours before and after contrast administration', 'FDA'),
('Lisinopril', 'Potassium', 'MODERATE', 'Risk of hyperkalemia', 'ACE inhibitors reduce potassium excretion', 'Monitor potassium levels regularly', 'MEDSCAPE'),
('Morphine', 'Benzodiazepines', 'SEVERE', 'Respiratory depression risk', 'Combined CNS depression can be life-threatening', 'Use lowest effective doses, monitor respiratory status', 'FDA'),
('Sertraline', 'Tramadol', 'SEVERE', 'Serotonin syndrome risk', 'Both drugs increase serotonin levels', 'Avoid combination or use with extreme caution', 'FDA'),
('Ciprofloxacin', 'Theophylline', 'MODERATE', 'Increased theophylline levels', 'Fluoroquinolones inhibit theophylline metabolism', 'Reduce theophylline dose by 30-50%', 'MEDSCAPE'),
('Fluoxetine', 'MAOIs', 'CONTRAINDICATED', 'Fatal serotonin syndrome', 'Severe hypertensive crisis possible', 'Do not use within 14 days of each other', 'FDA'),
('Methotrexate', 'NSAIDs', 'SEVERE', 'Increased methotrexate toxicity', 'NSAIDs reduce renal clearance of methotrexate', 'Avoid combination or monitor methotrexate levels', 'FDA')
ON CONFLICT DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE patient_allergies IS 'Tracks patient allergies and adverse reactions for medication safety';
COMMENT ON TABLE drug_interactions IS 'Known drug-drug interactions database for medication safety checking';
