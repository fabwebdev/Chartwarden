-- FLACC Scale Schema
-- Face, Legs, Activity, Cry, Consolability - Behavioral Pain Assessment Tool
-- Designed for pediatric (2 months - 7 years) and non-verbal patients

CREATE TABLE IF NOT EXISTS flacc_scales (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL REFERENCES patients(id),
    encounter_id BIGINT,
    note_id BIGINT,

    -- Assessment metadata
    assessment_date TIMESTAMP DEFAULT NOW() NOT NULL,
    assessment_type VARCHAR(50), -- INITIAL, FOLLOW_UP, REASSESSMENT, PRE_INTERVENTION, POST_INTERVENTION
    assessment_context VARCHAR(100), -- ROUTINE, PRN, PRE_MEDICATION, POST_MEDICATION, PROCEDURE
    assessed_by_id BIGINT,

    -- Patient population context
    patient_population VARCHAR(50), -- PEDIATRIC, NON_VERBAL_ADULT, COGNITIVELY_IMPAIRED, SEDATED, INTUBATED
    patient_age_months INTEGER, -- Age in months for pediatric context

    -- =========================================
    -- FLACC BEHAVIORAL SCORING (0-2 each)
    -- =========================================

    -- Face (0-2)
    -- 0 = No particular expression or smile
    -- 1 = Occasional grimace or frown, withdrawn, disinterested
    -- 2 = Frequent to constant quivering chin, clenched jaw
    face_score INTEGER NOT NULL CHECK (face_score >= 0 AND face_score <= 2),
    face_observation VARCHAR(255), -- NO_EXPRESSION, OCCASIONAL_GRIMACE, FREQUENT_GRIMACE
    face_notes TEXT,

    -- Legs (0-2)
    -- 0 = Normal position or relaxed
    -- 1 = Uneasy, restless, tense
    -- 2 = Kicking, or legs drawn up
    legs_score INTEGER NOT NULL CHECK (legs_score >= 0 AND legs_score <= 2),
    legs_observation VARCHAR(255), -- RELAXED, RESTLESS, KICKING
    legs_notes TEXT,

    -- Activity (0-2)
    -- 0 = Lying quietly, normal position, moves easily
    -- 1 = Squirming, shifting back and forth, tense
    -- 2 = Arched, rigid or jerking
    activity_score INTEGER NOT NULL CHECK (activity_score >= 0 AND activity_score <= 2),
    activity_observation VARCHAR(255), -- LYING_QUIETLY, SQUIRMING, ARCHED_RIGID
    activity_notes TEXT,

    -- Cry (0-2)
    -- 0 = No cry (awake or asleep)
    -- 1 = Moans or whimpers, occasional complaint
    -- 2 = Crying steadily, screams or sobs, frequent complaints
    cry_score INTEGER NOT NULL CHECK (cry_score >= 0 AND cry_score <= 2),
    cry_observation VARCHAR(255), -- NO_CRY, MOANS_WHIMPERS, CRYING_SCREAMING
    cry_notes TEXT,

    -- Consolability (0-2)
    -- 0 = Content, relaxed
    -- 1 = Reassured by occasional touching, hugging or being talked to, distractible
    -- 2 = Difficult to console or comfort
    consolability_score INTEGER NOT NULL CHECK (consolability_score >= 0 AND consolability_score <= 2),
    consolability_observation VARCHAR(255), -- CONTENT, DISTRACTIBLE, DIFFICULT_TO_CONSOLE
    consolability_notes TEXT,

    -- =========================================
    -- TOTAL SCORE AND INTERPRETATION
    -- =========================================

    -- Total FLACC Score (0-10)
    total_score INTEGER NOT NULL CHECK (total_score >= 0 AND total_score <= 10),

    -- Pain severity interpretation
    pain_severity VARCHAR(50), -- NO_PAIN, MILD, MODERATE, SEVERE

    -- Pain is considered present if score >= 1
    pain_present BOOLEAN DEFAULT FALSE,

    -- =========================================
    -- CLINICAL CONTEXT
    -- =========================================

    -- Current pain status
    pain_status VARCHAR(50), -- ACUTE, CHRONIC, BREAKTHROUGH, POST_PROCEDURAL

    -- Location if pain identified
    pain_location VARCHAR(255),
    pain_location_notes TEXT,

    -- Suspected cause
    suspected_cause VARCHAR(255),
    suspected_cause_notes TEXT,

    -- =========================================
    -- INTERVENTION TRACKING
    -- =========================================

    -- Was intervention provided?
    intervention_provided BOOLEAN DEFAULT FALSE,

    -- Type of intervention
    intervention_type VARCHAR(100), -- PHARMACOLOGICAL, NON_PHARMACOLOGICAL, COMBINATION

    -- Pharmacological intervention details
    medication_administered VARCHAR(255),
    medication_dose VARCHAR(100),
    medication_route VARCHAR(50), -- ORAL, IV, IM, SQ, RECTAL, TOPICAL
    medication_time TIMESTAMP,

    -- Non-pharmacological interventions (stored as array)
    non_pharm_interventions JSONB, -- Array: REPOSITIONING, COMFORT_HOLD, SWADDLING, DISTRACTION, PACIFIER, MUSIC, MASSAGE, etc.

    -- Time to reassess after intervention
    reassessment_time TIMESTAMP,
    reassessment_score INTEGER,

    -- Intervention effectiveness
    intervention_effectiveness VARCHAR(50), -- EFFECTIVE, PARTIALLY_EFFECTIVE, NOT_EFFECTIVE

    -- =========================================
    -- HOSPICE CARE SPECIFIC FIELDS
    -- =========================================

    -- Comfort measures focused (hospice-specific)
    comfort_goal_met BOOLEAN,
    comfort_goal_notes TEXT,

    -- Family/caregiver involvement
    caregiver_present BOOLEAN,
    caregiver_observations TEXT,
    caregiver_education_provided BOOLEAN,

    -- Plan of care updates needed
    care_plan_update_needed BOOLEAN,
    care_plan_recommendations TEXT,

    -- =========================================
    -- CLINICAL NOTES AND SUMMARY
    -- =========================================

    clinical_notes TEXT,
    assessment_summary TEXT,
    follow_up_plan TEXT,

    -- =========================================
    -- SIGNATURE AND COMPLIANCE (21 CFR Part 11)
    -- =========================================

    signature_id BIGINT,
    signed_at TIMESTAMP,
    signed_by_id BIGINT,

    -- Amendment tracking
    amended BOOLEAN DEFAULT FALSE,
    amendment_reason TEXT,
    amended_at TIMESTAMP,
    amended_by_id BIGINT,

    -- =========================================
    -- AUDIT FIELDS
    -- =========================================

    created_by_id BIGINT,
    updated_by_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flacc_scales_patient_id ON flacc_scales(patient_id);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_assessment_date ON flacc_scales(assessment_date);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_total_score ON flacc_scales(total_score);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_patient_date ON flacc_scales(patient_id, assessment_date);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_patient_score ON flacc_scales(patient_id, total_score);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_population ON flacc_scales(patient_population);
CREATE INDEX IF NOT EXISTS idx_flacc_scales_pain_severity ON flacc_scales(pain_severity);

-- Add comments for documentation
COMMENT ON TABLE flacc_scales IS 'FLACC (Face, Legs, Activity, Cry, Consolability) Scale - Behavioral pain assessment for pediatric and non-verbal patients';
COMMENT ON COLUMN flacc_scales.face_score IS 'Face score (0-2): 0=no expression, 1=occasional grimace, 2=frequent quivering chin/clenched jaw';
COMMENT ON COLUMN flacc_scales.legs_score IS 'Legs score (0-2): 0=relaxed, 1=restless/tense, 2=kicking/drawn up';
COMMENT ON COLUMN flacc_scales.activity_score IS 'Activity score (0-2): 0=lying quietly, 1=squirming/shifting, 2=arched/rigid/jerking';
COMMENT ON COLUMN flacc_scales.cry_score IS 'Cry score (0-2): 0=no cry, 1=moans/whimpers, 2=crying steadily/screaming';
COMMENT ON COLUMN flacc_scales.consolability_score IS 'Consolability score (0-2): 0=content, 1=distractible, 2=difficult to console';
COMMENT ON COLUMN flacc_scales.total_score IS 'Total FLACC score (0-10): 0=no pain, 1-3=mild, 4-6=moderate, 7-10=severe';
COMMENT ON COLUMN flacc_scales.patient_population IS 'Target population: PEDIATRIC (2mo-7yr), NON_VERBAL_ADULT, COGNITIVELY_IMPAIRED, SEDATED, INTUBATED';
COMMENT ON COLUMN flacc_scales.non_pharm_interventions IS 'JSON array of non-pharmacological interventions: REPOSITIONING, COMFORT_HOLD, SWADDLING, DISTRACTION, PACIFIER, MUSIC, MASSAGE, HEAT, COLD, etc.';
