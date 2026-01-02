-- Test Patients with Various Scenarios for Chartwarden EHR
-- Covers different demographics, diagnoses, and care situations

-- Patient 1: Elderly woman with terminal cancer, active hospice care
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Margaret', 'Thompson', 'Rose', '1938-03-15', 'Female', '123-45-6789',
    NOW(), NOW()
);

-- Patient 2: Elderly man with end-stage heart failure
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Robert', 'Johnson', 'Earl', '1942-07-22', 'Male', '234-56-7890',
    NOW(), NOW()
);

-- Patient 3: Middle-aged woman with ALS (Lou Gehrig's disease)
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Jennifer', 'Martinez', 'Ann', '1975-11-08', 'Female', '345-67-8901',
    NOW(), NOW()
);

-- Patient 4: Elderly man with advanced dementia
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'William', 'Davis', 'Henry', '1935-05-30', 'Male', '456-78-9012',
    NOW(), NOW()
);

-- Patient 5: Elderly woman with end-stage COPD
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Patricia', 'Wilson', 'Marie', '1940-09-12', 'Female', '567-89-0123',
    NOW(), NOW()
);

-- Patient 6: Elderly man with liver failure
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'James', 'Anderson', 'Michael', '1948-01-25', 'Male', '678-90-1234',
    NOW(), NOW()
);

-- Patient 7: Elderly woman with Parkinson's disease
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Linda', 'Taylor', 'Sue', '1944-12-03', 'Female', '789-01-2345',
    NOW(), NOW()
);

-- Patient 8: Young adult with terminal brain cancer
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Michael', 'Brown', 'Christopher', '1995-06-18', 'Male', '890-12-3456',
    NOW(), NOW()
);

-- Patient 9: Elderly man with kidney failure (no dialysis)
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Charles', 'Miller', 'Edward', '1941-08-09', 'Male', '901-23-4567',
    NOW(), NOW()
);

-- Patient 10: Elderly woman with stroke complications
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Barbara', 'Moore', 'Jean', '1939-04-27', 'Female', '012-34-5678',
    NOW(), NOW()
);

-- Patient 11: Elderly man with pancreatic cancer
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Richard', 'Jackson', 'Allen', '1943-10-14', 'Male', '123-98-7654',
    NOW(), NOW()
);

-- Patient 12: Elderly woman with multiple myeloma
INSERT INTO patients (
    first_name, last_name, middle_name, date_of_birth, gender, ssn,
    created_at, updated_at
) VALUES (
    'Susan', 'White', 'Elizabeth', '1947-02-19', 'Female', '234-87-6543',
    NOW(), NOW()
);

-- Add addresses for patients
INSERT INTO address (patient_id, address_line_1, address_line_2, city, state, zip_code, created_at, updated_at)
SELECT
    id,
    CASE
        WHEN first_name = 'Margaret' THEN '1234 Oak Street'
        WHEN first_name = 'Robert' THEN '5678 Maple Avenue'
        WHEN first_name = 'Jennifer' THEN '9012 Pine Road'
        WHEN first_name = 'William' THEN '3456 Elm Drive'
        WHEN first_name = 'Patricia' THEN '7890 Cedar Lane'
        WHEN first_name = 'James' THEN '2345 Birch Court'
        WHEN first_name = 'Linda' THEN '6789 Willow Way'
        WHEN first_name = 'Michael' THEN '0123 Spruce Street'
        WHEN first_name = 'Charles' THEN '4567 Ash Boulevard'
        WHEN first_name = 'Barbara' THEN '8901 Poplar Place'
        WHEN first_name = 'Richard' THEN '2468 Hickory Drive'
        WHEN first_name = 'Susan' THEN '1357 Sycamore Avenue'
    END as address_line_1,
    NULL as address_line_2,
    CASE
        WHEN id % 4 = 0 THEN 'Phoenix'
        WHEN id % 4 = 1 THEN 'Scottsdale'
        WHEN id % 4 = 2 THEN 'Tempe'
        ELSE 'Mesa'
    END as city,
    'AZ' as state,
    CASE
        WHEN id % 4 = 0 THEN '85001'
        WHEN id % 4 = 1 THEN '85251'
        WHEN id % 4 = 2 THEN '85281'
        ELSE '85201'
    END as zip_code,
    NOW(),
    NOW()
FROM patients
WHERE address_line_1 IS NULL;

-- Add living arrangements for patients
INSERT INTO living_arrangements (
    patient_id, living_arrangement, lives_with, primary_caregiver_name,
    primary_caregiver_phone, primary_caregiver_relationship,
    created_at, updated_at
)
SELECT
    id,
    CASE
        WHEN id % 3 = 0 THEN 'Home with family'
        WHEN id % 3 = 1 THEN 'Assisted living facility'
        ELSE 'Home alone with caregiver support'
    END as living_arrangement,
    CASE
        WHEN id % 3 = 0 THEN 'Spouse and children'
        WHEN id % 3 = 1 THEN 'Facility staff'
        ELSE 'Lives alone'
    END as lives_with,
    CASE
        WHEN first_name = 'Margaret' THEN 'John Thompson'
        WHEN first_name = 'Robert' THEN 'Mary Johnson'
        WHEN first_name = 'Jennifer' THEN 'Carlos Martinez'
        WHEN first_name = 'William' THEN 'Sarah Davis'
        WHEN first_name = 'Patricia' THEN 'Facility Staff'
        WHEN first_name = 'James' THEN 'Emily Anderson'
        WHEN first_name = 'Linda' THEN 'David Taylor'
        WHEN first_name = 'Michael' THEN 'Lisa Brown'
        WHEN first_name = 'Charles' THEN 'Facility Staff'
        WHEN first_name = 'Barbara' THEN 'Thomas Moore'
        WHEN first_name = 'Richard' THEN 'Nancy Jackson'
        WHEN first_name = 'Susan' THEN 'Robert White'
    END as primary_caregiver_name,
    CASE
        WHEN id % 3 = 0 THEN '602-555-' || LPAD((1000 + id)::text, 4, '0')
        WHEN id % 3 = 1 THEN '480-555-' || LPAD((1000 + id)::text, 4, '0')
        ELSE '623-555-' || LPAD((1000 + id)::text, 4, '0')
    END as primary_caregiver_phone,
    CASE
        WHEN id % 3 = 0 THEN 'Spouse'
        WHEN id % 3 = 1 THEN 'Professional caregiver'
        ELSE 'Adult child'
    END as primary_caregiver_relationship,
    NOW(),
    NOW()
FROM patients;

-- Add spiritual preferences
INSERT INTO spiritual_preference (
    patient_id, religious_affiliation, spiritual_needs,
    chaplain_services_desired, created_at, updated_at
)
SELECT
    id,
    CASE
        WHEN id % 5 = 0 THEN 'Christian - Catholic'
        WHEN id % 5 = 1 THEN 'Christian - Protestant'
        WHEN id % 5 = 2 THEN 'Jewish'
        WHEN id % 5 = 3 THEN 'None'
        ELSE 'Other'
    END as religious_affiliation,
    CASE
        WHEN id % 3 = 0 THEN 'Prayer and scripture reading'
        WHEN id % 3 = 1 THEN 'Meditation and quiet time'
        ELSE 'Family spiritual support'
    END as spiritual_needs,
    CASE WHEN id % 2 = 0 THEN true ELSE false END as chaplain_services_desired,
    NOW(),
    NOW()
FROM patients;

-- Add payer information (insurance)
INSERT INTO payer_information (
    patient_id, payer_name, payer_type, policy_number,
    group_number, subscriber_name, relationship_to_patient,
    effective_date, created_at, updated_at
)
SELECT
    id,
    CASE
        WHEN id % 4 = 0 THEN 'Medicare Part A & B'
        WHEN id % 4 = 1 THEN 'Medicaid'
        WHEN id % 4 = 2 THEN 'Blue Cross Blue Shield'
        ELSE 'Aetna'
    END as payer_name,
    CASE
        WHEN id % 4 = 0 THEN 'Medicare'
        WHEN id % 4 = 1 THEN 'Medicaid'
        ELSE 'Private Insurance'
    END as payer_type,
    'POL-' || LPAD(id::text, 8, '0') as policy_number,
    CASE
        WHEN id % 4 IN (2, 3) THEN 'GRP-' || LPAD((id * 100)::text, 6, '0')
        ELSE NULL
    END as group_number,
    first_name || ' ' || last_name as subscriber_name,
    'Self' as relationship_to_patient,
    (NOW() - INTERVAL '6 months') as effective_date,
    NOW(),
    NOW()
FROM patients;

-- Output summary
SELECT
    'Created ' || COUNT(*) || ' test patients with comprehensive data' as summary
FROM patients;
