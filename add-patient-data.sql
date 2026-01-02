-- Add comprehensive data for test patients

-- Add addresses for patients
INSERT INTO address (patient_id, address_line_1, address_line_2, city, state, zip_code, created_at, updated_at)
SELECT
    p.id,
    CASE
        WHEN p.first_name = 'Margaret' THEN '1234 Oak Street'
        WHEN p.first_name = 'Robert' THEN '5678 Maple Avenue'
        WHEN p.first_name = 'Jennifer' THEN '9012 Pine Road'
        WHEN p.first_name = 'William' THEN '3456 Elm Drive'
        WHEN p.first_name = 'Patricia' THEN '7890 Cedar Lane'
        WHEN p.first_name = 'James' THEN '2345 Birch Court'
        WHEN p.first_name = 'Linda' THEN '6789 Willow Way'
        WHEN p.first_name = 'Michael' THEN '0123 Spruce Street'
        WHEN p.first_name = 'Charles' THEN '4567 Ash Boulevard'
        WHEN p.first_name = 'Barbara' THEN '8901 Poplar Place'
        WHEN p.first_name = 'Richard' THEN '2468 Hickory Drive'
        WHEN p.first_name = 'Susan' THEN '1357 Sycamore Avenue'
    END as address_line_1,
    NULL as address_line_2,
    CASE
        WHEN p.id % 4 = 0 THEN 'Phoenix'
        WHEN p.id % 4 = 1 THEN 'Scottsdale'
        WHEN p.id % 4 = 2 THEN 'Tempe'
        ELSE 'Mesa'
    END as city,
    'AZ' as state,
    CASE
        WHEN p.id % 4 = 0 THEN '85001'
        WHEN p.id % 4 = 1 THEN '85251'
        WHEN p.id % 4 = 2 THEN '85281'
        ELSE '85201'
    END as zip_code,
    NOW(),
    NOW()
FROM patients p
LEFT JOIN address a ON p.id = a.patient_id
WHERE a.id IS NULL
LIMIT 12;

-- Add living arrangements
INSERT INTO living_arrangements (
    patient_id, primary_caregiver, primary_location_of_patient,
    caregiver_availability, patient_able, need_hospice_service,
    created_at, updated_at
)
SELECT
    p.id,
    CASE
        WHEN p.first_name = 'Margaret' THEN 'John Thompson (Spouse)'
        WHEN p.first_name = 'Robert' THEN 'Mary Johnson (Daughter)'
        WHEN p.first_name = 'Jennifer' THEN 'Carlos Martinez (Husband)'
        WHEN p.first_name = 'William' THEN 'Sarah Davis (Professional)'
        WHEN p.first_name = 'Patricia' THEN 'Facility Staff'
        WHEN p.first_name = 'James' THEN 'Emily Anderson (Wife)'
        WHEN p.first_name = 'Linda' THEN 'David Taylor (Son)'
        WHEN p.first_name = 'Michael' THEN 'Lisa Brown (Mother)'
        WHEN p.first_name = 'Charles' THEN 'Facility Staff'
        WHEN p.first_name = 'Barbara' THEN 'Thomas Moore (Son)'
        WHEN p.first_name = 'Richard' THEN 'Nancy Jackson (Wife)'
        WHEN p.first_name = 'Susan' THEN 'Robert White (Husband)'
    END as primary_caregiver,
    CASE
        WHEN p.id % 3 = 0 THEN 'Private home'
        WHEN p.id % 3 = 1 THEN 'Assisted living facility'
        ELSE 'Private home with nursing support'
    END as primary_location_of_patient,
    CASE
        WHEN p.id % 2 = 0 THEN '24/7 availability'
        ELSE 'Daytime hours with on-call support'
    END as caregiver_availability,
    CASE WHEN p.id % 3 = 0 THEN true ELSE false END as patient_able,
    CASE
        WHEN p.id % 3 = 0 THEN 'Routine home visits'
        WHEN p.id % 3 = 1 THEN 'Daily nursing care'
        ELSE 'Continuous care'
    END as need_hospice_service,
    NOW(),
    NOW()
FROM patients p
LEFT JOIN living_arrangements la ON p.id = la.patient_id
WHERE la.id IS NULL
LIMIT 12;

-- Add payer information
INSERT INTO payer_information (
    patient_id, social_security, medicare_beneficiary, medicaid_number,
    payer_info, medicaid_recipient, created_at, updated_at
)
SELECT
    p.id,
    p.ssn as social_security,
    CASE
        WHEN p.id % 4 = 0 THEN 'MBI-' || LPAD(p.id::text, 10, '0')
        ELSE NULL
    END as medicare_beneficiary,
    CASE
        WHEN p.id % 4 = 1 THEN 'MC-' || LPAD((p.id * 100)::text, 9, '0')
        ELSE NULL
    END as medicaid_number,
    CASE
        WHEN p.id % 4 = 0 THEN 'Medicare Part A & B'
        WHEN p.id % 4 = 1 THEN 'Medicaid'
        WHEN p.id % 4 = 2 THEN 'Blue Cross Blue Shield'
        ELSE 'Aetna Medicare Advantage'
    END as payer_info,
    CASE WHEN p.id % 4 = 1 THEN true ELSE false END as medicaid_recipient,
    NOW(),
    NOW()
FROM patients p
LEFT JOIN payer_information pi ON p.id = pi.patient_id
WHERE pi.id IS NULL
LIMIT 12;

-- Add pain assessments for patients
INSERT INTO pain_assessments (
    patient_id, assessment_date, pain_level, pain_location,
    pain_description, created_at, updated_at
)
SELECT
    p.id,
    NOW() - INTERVAL '1 day' as assessment_date,
    CASE
        WHEN p.id % 10 <= 3 THEN 2  -- Mild pain
        WHEN p.id % 10 <= 6 THEN 5  -- Moderate pain
        WHEN p.id % 10 <= 8 THEN 7  -- Severe pain
        ELSE 9                       -- Very severe pain
    END as pain_level,
    CASE
        WHEN p.first_name = 'Margaret' THEN 'Abdomen, lower back'
        WHEN p.first_name = 'Robert' THEN 'Chest, left shoulder'
        WHEN p.first_name = 'Jennifer' THEN 'Muscles, joints'
        WHEN p.first_name = 'William' THEN 'Generalized discomfort'
        WHEN p.first_name = 'Patricia' THEN 'Chest, difficulty breathing'
        WHEN p.first_name = 'James' THEN 'Abdomen, right upper quadrant'
        WHEN p.first_name = 'Linda' THEN 'Tremors, muscle stiffness'
        WHEN p.first_name = 'Michael' THEN 'Head, severe headaches'
        WHEN p.first_name = 'Charles' THEN 'Lower back, fatigue'
        WHEN p.first_name = 'Barbara' THEN 'Right side weakness'
        WHEN p.first_name = 'Richard' THEN 'Severe abdominal pain'
        WHEN p.first_name = 'Susan' THEN 'Bone pain, generalized'
    END as pain_location,
    CASE
        WHEN p.id % 3 = 0 THEN 'Sharp, intermittent pain'
        WHEN p.id % 3 = 1 THEN 'Dull, constant ache'
        ELSE 'Burning sensation with occasional spikes'
    END as pain_description,
    NOW(),
    NOW()
FROM patients p
LIMIT 12;

-- Add nursing clinical notes
INSERT INTO nursing_clinical_notes (
    patient_id, note_date, note_type, clinical_note,
    vital_signs_recorded, created_at, updated_at
)
SELECT
    p.id,
    NOW() - INTERVAL '2 hours' as note_date,
    'Assessment' as note_type,
    CASE
        WHEN p.first_name = 'Margaret' THEN 'Patient alert and oriented. Pain managed with current medication regimen. Family present and supportive. Discussed advance directives.'
        WHEN p.first_name = 'Robert' THEN 'Dyspnea on exertion noted. O2 saturation maintaining at 92% on 2L NC. Patient resting comfortably. Caregiver educated on symptom management.'
        WHEN p.first_name = 'Jennifer' THEN 'Progressive muscle weakness noted in upper extremities. Speech therapist consulted. Communication device in place. Patient emotionally stable.'
        WHEN p.first_name = 'William' THEN 'Patient confused about time and place. Agitation managed with non-pharmacological interventions. Caregiver support provided.'
        WHEN p.first_name = 'Patricia' THEN 'Respiratory status declining. Nebulizer treatments administered. Patient expressing comfort goals prioritized over aggressive treatment.'
        WHEN p.first_name = 'James' THEN 'Jaundice progressing. Fluid retention managed. Patient and family educated about disease progression. Comfort measures in place.'
        WHEN p.first_name = 'Linda' THEN 'Tremors controlled with medication. Fall risk precautions in place. Physical therapy assessment completed. Home safety modifications recommended.'
        WHEN p.first_name = 'Michael' THEN 'Headache severity increasing. Adjusted pain medication per physician orders. Patient verbalizing fears about prognosis. Chaplain referral made.'
        WHEN p.first_name = 'Charles' THEN 'Dialysis discontinued per patient wishes. Symptom management initiated. Family meeting scheduled to discuss goals of care.'
        WHEN p.first_name = 'Barbara' THEN 'Right-sided weakness stable. Speech improving with therapy. Patient motivated to participate in care. Home exercise program established.'
        WHEN p.first_name = 'Richard' THEN 'Pain control challenging. Medication titrated. Palliative care team consulted. Patient expressing desire for comfort-focused care.'
        WHEN p.first_name = 'Susan' THEN 'Bone pain managed with combination therapy. Patient maintaining independence in ADLs with assistance. Emotional support provided.'
    END as clinical_note,
    true as vital_signs_recorded,
    NOW(),
    NOW()
FROM patients p
LIMIT 12;

-- Add vital signs
INSERT INTO vital_signs (
    patient_id, assessment_date, temperature, blood_pressure_systolic,
    blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation,
    created_at, updated_at
)
SELECT
    p.id,
    NOW() - INTERVAL '3 hours' as assessment_date,
    CASE
        WHEN p.id % 5 = 0 THEN '98.6'
        WHEN p.id % 5 = 1 THEN '99.2'
        WHEN p.id % 5 = 2 THEN '97.8'
        WHEN p.id % 5 = 3 THEN '98.4'
        ELSE '99.0'
    END as temperature,
    CASE
        WHEN p.id % 4 = 0 THEN '120'
        WHEN p.id % 4 = 1 THEN '110'
        WHEN p.id % 4 = 2 THEN '135'
        ELSE '128'
    END as blood_pressure_systolic,
    CASE
        WHEN p.id % 4 = 0 THEN '75'
        WHEN p.id % 4 = 1 THEN '70'
        WHEN p.id % 4 = 2 THEN '82'
        ELSE '78'
    END as blood_pressure_diastolic,
    CASE
        WHEN p.id % 5 = 0 THEN '72'
        WHEN p.id % 5 = 1 THEN '88'
        WHEN p.id % 5 = 2 THEN '65'
        WHEN p.id % 5 = 3 THEN '95'
        ELSE '80'
    END as heart_rate,
    CASE
        WHEN p.id % 4 = 0 THEN '16'
        WHEN p.id % 4 = 1 THEN '22'
        WHEN p.id % 4 = 2 THEN '18'
        ELSE '20'
    END as respiratory_rate,
    CASE
        WHEN p.id % 3 = 0 THEN '96'
        WHEN p.id % 3 = 1 THEN '92'
        ELSE '95'
    END as oxygen_saturation,
    NOW(),
    NOW()
FROM patients p
LIMIT 12;

-- Summary
SELECT
    COUNT(DISTINCT p.id) as total_patients,
    COUNT(DISTINCT a.id) as patients_with_addresses,
    COUNT(DISTINCT la.id) as patients_with_living_arrangements,
    COUNT(DISTINCT pi.id) as patients_with_payer_info,
    COUNT(DISTINCT pa.id) as patients_with_pain_assessments,
    COUNT(DISTINCT ncn.id) as patients_with_nursing_notes,
    COUNT(DISTINCT vs.id) as patients_with_vital_signs
FROM patients p
LEFT JOIN address a ON p.id = a.patient_id
LEFT JOIN living_arrangements la ON p.id = la.patient_id
LEFT JOIN payer_information pi ON p.id = pi.patient_id
LEFT JOIN pain_assessments pa ON p.id = pa.patient_id
LEFT JOIN nursing_clinical_notes ncn ON p.id = ncn.patient_id
LEFT JOIN vital_signs vs ON p.id = vs.patient_id
WHERE p.created_at >= NOW() - INTERVAL '1 hour';
