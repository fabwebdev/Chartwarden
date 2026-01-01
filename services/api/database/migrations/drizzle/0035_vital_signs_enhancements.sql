-- Vital Signs Schema Enhancements
-- Adds comprehensive vital signs tracking with BP, HR, RR, Temp, SpO2, Pain
-- Includes timestamp, value, and unit information for each measurement

-- Add patient_id reference
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS patient_id BIGINT REFERENCES patients(id);

-- Add encounter reference
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS encounter_id BIGINT;

-- Add measurement timestamp
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS measurement_timestamp TIMESTAMP DEFAULT NOW() NOT NULL;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS measured_by_id BIGINT;

-- =========================================
-- TEMPERATURE ENHANCEMENTS
-- =========================================
-- Change degrees_fahrenheit from integer to decimal for precision
-- Note: We keep the original column type to avoid data loss
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS degrees_celsius DECIMAL(5,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS temperature_unit VARCHAR(10) DEFAULT 'F';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS temperature_notes TEXT;

-- =========================================
-- HEART RATE ENHANCEMENTS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS heart_rate_unit VARCHAR(10) DEFAULT 'BPM';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS heart_rate_notes TEXT;

-- =========================================
-- BLOOD PRESSURE ENHANCEMENTS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bp_unit VARCHAR(10) DEFAULT 'mmHg';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bp_cuff_size VARCHAR(50);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bp_notes TEXT;

-- =========================================
-- RESPIRATORY RATE ENHANCEMENTS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_rate_unit VARCHAR(20) DEFAULT 'breaths/min';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_pattern VARCHAR(255);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS respiratory_notes TEXT;

-- =========================================
-- OXYGEN SATURATION ENHANCEMENTS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse_ox_unit VARCHAR(10) DEFAULT '%';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS supplemental_oxygen BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_flow_rate DECIMAL(4,1);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS oxygen_delivery_method VARCHAR(100);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse_ox_notes TEXT;

-- =========================================
-- PAIN ASSESSMENT (NEW)
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score INTEGER;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_score_unit VARCHAR(20) DEFAULT '0-10 scale';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_scale_used VARCHAR(100);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_location VARCHAR(255);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_location_other TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_quality VARCHAR(255);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_radiation VARCHAR(255);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_onset VARCHAR(100);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_duration VARCHAR(100);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_aggravating_factors TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_relieving_factors TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_intervention_given BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_intervention_description TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_post_intervention_score INTEGER;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_notes TEXT;

-- =========================================
-- BODY MEASUREMENTS ENHANCEMENTS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS body_height_cm DECIMAL(6,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS height_unit VARCHAR(10) DEFAULT 'in';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS body_weight_lbs DECIMAL(6,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'lbs';
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight_change_percentage DECIMAL(5,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight_change_period_days INTEGER;

-- =========================================
-- GENERAL NOTES AND OBSERVATIONS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS general_notes TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS patient_position_during_assessment VARCHAR(100);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS patient_activity_prior VARCHAR(255);

-- =========================================
-- CLINICAL FLAGS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS is_abnormal BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS abnormal_values TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS requires_follow_up BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS notified_provider BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS notified_provider_at TIMESTAMP;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS notified_provider_id BIGINT;

-- =========================================
-- SIGNATURE AND COMPLIANCE (21 CFR Part 11)
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS signature_id BIGINT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS signed_by_id BIGINT;

-- Amendment tracking
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS amended BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS amendment_reason TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS amended_at TIMESTAMP;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS amended_by_id BIGINT;

-- =========================================
-- AUDIT FIELDS
-- =========================================
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS created_by_id BIGINT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS updated_by_id BIGINT;

-- =========================================
-- PERFORMANCE INDEXES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_measurement_timestamp ON vital_signs(measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_vital_signs_note_id ON vital_signs(note_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_patient_timestamp ON vital_signs(patient_id, measurement_timestamp);
CREATE INDEX IF NOT EXISTS idx_vital_signs_abnormal ON vital_signs(is_abnormal);
CREATE INDEX IF NOT EXISTS idx_vital_signs_pain_score ON vital_signs(pain_score);

-- =========================================
-- DOCUMENTATION COMMENTS
-- =========================================
COMMENT ON TABLE vital_signs IS 'Comprehensive vital signs tracking for hospice patients - BP, HR, RR, Temp, SpO2, Pain with timestamp, value, and unit information';
COMMENT ON COLUMN vital_signs.patient_id IS 'Reference to the patient for patient-scoped queries';
COMMENT ON COLUMN vital_signs.measurement_timestamp IS 'When the vital signs were actually measured (may differ from created_at)';
COMMENT ON COLUMN vital_signs.pain_score IS 'Pain score (0-10 scale) using various assessment tools (NRS, VAS, FLACC, PAINAD, etc.)';
COMMENT ON COLUMN vital_signs.pain_scale_used IS 'Pain scale used: NRS, VAS, FACES, FLACC, PAINAD, CPOT, WONG_BAKER';
COMMENT ON COLUMN vital_signs.is_abnormal IS 'Flag indicating if any vital sign is outside normal ranges';
COMMENT ON COLUMN vital_signs.abnormal_values IS 'JSON array of which specific values are abnormal (e.g., TEMP_CRITICAL:105F, HR_ABNORMAL:120)';
COMMENT ON COLUMN vital_signs.temperature_unit IS 'Temperature unit: F (Fahrenheit) or C (Celsius)';
COMMENT ON COLUMN vital_signs.oxygen_delivery_method IS 'Oxygen delivery: NASAL_CANNULA, MASK, VENTI_MASK, NON_REBREATHER, HIGH_FLOW';
COMMENT ON COLUMN vital_signs.respiratory_pattern IS 'Respiratory pattern: NORMAL, SHALLOW, DEEP, LABORED, APNEIC';
