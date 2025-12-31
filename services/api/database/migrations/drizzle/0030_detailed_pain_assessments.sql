-- Detailed Pain Assessments Schema
-- Comprehensive pain assessments including location, quality, severity, triggers, and interventions

CREATE TABLE IF NOT EXISTS detailed_pain_assessments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT NOT NULL,
    encounter_id BIGINT,

    -- Assessment metadata
    assessment_date TIMESTAMP DEFAULT NOW() NOT NULL,
    assessment_type VARCHAR(50), -- INITIAL, FOLLOW_UP, REASSESSMENT
    assessed_by_id BIGINT,

    -- Pain presence and status
    pain_present BOOLEAN DEFAULT FALSE,
    pain_status VARCHAR(50), -- ACTIVE, CONTROLLED, RESOLVED, WORSENING

    -- Pain Location
    primary_pain_location VARCHAR(255),
    primary_pain_location_side VARCHAR(50), -- LEFT, RIGHT, BILATERAL, MIDLINE
    secondary_pain_locations JSONB, -- Array of {location, side, description}
    pain_radiation TEXT,
    pain_location_notes TEXT,

    -- Pain Quality/Character
    pain_quality JSONB, -- Array: SHARP, DULL, ACHING, BURNING, THROBBING, STABBING, CRAMPING, SHOOTING
    pain_quality_description TEXT,

    -- Pain Severity
    pain_scale_type VARCHAR(50), -- NUMERIC_0_10, FACES, WONG_BAKER, VAS, PAINAD, FLACC
    pain_level_current INTEGER,
    pain_level_at_rest INTEGER,
    pain_level_with_activity INTEGER,
    pain_level_worst_24h INTEGER,
    pain_level_best_24h INTEGER,
    pain_level_average INTEGER,
    acceptable_pain_level INTEGER,

    -- Pain Timing/Pattern
    pain_onset VARCHAR(255),
    pain_duration VARCHAR(100), -- CONSTANT, INTERMITTENT, BRIEF, PROLONGED
    pain_frequency VARCHAR(100), -- CONTINUOUS, DAILY, WEEKLY, OCCASIONAL
    pain_pattern VARCHAR(100), -- CONSTANT, FLUCTUATING, PREDICTABLE, UNPREDICTABLE
    time_of_day_worst VARCHAR(100),

    -- Pain Triggers
    pain_triggers JSONB,
    trigger_movement BOOLEAN,
    trigger_position_changes BOOLEAN,
    trigger_breathing BOOLEAN,
    trigger_eating BOOLEAN,
    trigger_stress BOOLEAN,
    trigger_weather BOOLEAN,
    trigger_touch BOOLEAN,
    trigger_temperature BOOLEAN,
    other_triggers TEXT,

    -- Relieving Factors
    relieving_factors JSONB,
    relief_rest BOOLEAN,
    relief_position BOOLEAN,
    relief_heat BOOLEAN,
    relief_cold BOOLEAN,
    relief_massage BOOLEAN,
    relief_distraction BOOLEAN,
    relief_medication BOOLEAN,
    other_relief TEXT,

    -- Pain Impact on Function
    impact_on_sleep INTEGER,
    impact_on_mobility INTEGER,
    impact_on_appetite INTEGER,
    impact_on_mood INTEGER,
    impact_on_daily_activities INTEGER,
    impact_on_social INTEGER,
    functional_impact_notes TEXT,

    -- Current Pain Interventions
    current_interventions JSONB,

    -- Pharmacological interventions
    current_medications JSONB,
    breakthrough_medication VARCHAR(255),
    breakthrough_dose VARCHAR(100),
    breakthrough_effectiveness INTEGER,
    medication_side_effects TEXT,

    -- Non-pharmacological interventions
    non_pharm_interventions JSONB,
    non_pharm_effectiveness TEXT,

    -- Intervention Effectiveness
    overall_pain_control VARCHAR(50), -- EXCELLENT, GOOD, FAIR, POOR, UNCONTROLLED
    intervention_effectiveness INTEGER,
    time_to_relief VARCHAR(100),
    duration_of_relief VARCHAR(100),

    -- Goals and Plan
    pain_management_goal TEXT,
    recommended_interventions JSONB,
    follow_up_plan TEXT,
    referral_needed BOOLEAN,
    referral_type VARCHAR(100),

    -- Breakthrough Pain Assessment
    breakthrough_pain_present BOOLEAN,
    breakthrough_frequency VARCHAR(100),
    breakthrough_duration VARCHAR(100),
    breakthrough_predictable BOOLEAN,
    breakthrough_triggers TEXT,

    -- Patient/Caregiver Education
    patient_education_provided BOOLEAN,
    education_topics JSONB,
    patient_understanding VARCHAR(50),
    caregiver_education_provided BOOLEAN,

    -- Clinical Notes
    clinical_notes TEXT,
    assessment_summary TEXT,

    -- Signature and compliance
    signature_id BIGINT,
    signed_at TIMESTAMP,

    -- Audit fields
    created_by_id BIGINT,
    updated_by_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_detailed_pain_assessments_patient_id ON detailed_pain_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_detailed_pain_assessments_encounter_id ON detailed_pain_assessments(encounter_id);
CREATE INDEX IF NOT EXISTS idx_detailed_pain_assessments_assessment_date ON detailed_pain_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_detailed_pain_assessments_pain_status ON detailed_pain_assessments(pain_status);

-- Add comments for documentation
COMMENT ON TABLE detailed_pain_assessments IS 'Comprehensive pain assessments for hospice patients including location, quality, severity, triggers, and interventions';
COMMENT ON COLUMN detailed_pain_assessments.pain_quality IS 'JSON array of pain descriptors: SHARP, DULL, ACHING, BURNING, THROBBING, STABBING, CRAMPING, SHOOTING, etc.';
COMMENT ON COLUMN detailed_pain_assessments.pain_triggers IS 'JSON array of trigger objects with type and description';
COMMENT ON COLUMN detailed_pain_assessments.current_medications IS 'JSON array of medication objects: {name, dose, route, frequency, effectiveness}';
COMMENT ON COLUMN detailed_pain_assessments.non_pharm_interventions IS 'JSON array: HEAT, COLD, MASSAGE, REPOSITIONING, DISTRACTION, RELAXATION, etc.';
