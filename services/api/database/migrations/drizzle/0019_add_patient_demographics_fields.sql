-- Add comprehensive patient demographics fields
-- This migration adds name variations, HIPAA compliance fields, and other demographic data

-- Add name variation fields
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "mi" varchar(255);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "preferred_name" varchar(255);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "suffix" varchar(255);

-- Add HIPAA and consent fields (stored as bigint for boolean: 0/1)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "oxygen_dependent" bigint;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "patient_consents" bigint;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "hipaa_received" bigint;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "veterans_status" bigint;

-- Add DME provider field (text field for equipment type)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "dme_provider" varchar(255);

-- Add email field for direct patient contact
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "email" varchar(255);

-- Add primary phone field for direct patient contact (alternative to address table)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "primary_phone" varchar(50);

-- Add emergency contact name (quick reference without looking up liaison table)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "emergency_contact_name" varchar(255);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "emergency_contact_phone" varchar(50);
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "emergency_contact_relationship" varchar(100);

-- Add marital status for demographic tracking
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "marital_status" varchar(50);

-- Add language preference for patient communication
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "preferred_language" varchar(100);

-- Add Medicare Beneficiary Identifier (MBI) - required for hospice billing
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "medicare_beneficiary_id" varchar(50);

-- Add Medicaid ID for dual-eligible patients
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "medicaid_id" varchar(50);

-- Add medical record number (internal identifier)
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "medical_record_number" varchar(100);

-- Add comments about sensitive SSN field
COMMENT ON COLUMN "patients"."ssn" IS 'Social Security Number - sensitive PII, should be encrypted at rest';

-- Add comments for boolean fields
COMMENT ON COLUMN "patients"."oxygen_dependent" IS 'Boolean (0/1): Patient requires oxygen therapy';
COMMENT ON COLUMN "patients"."patient_consents" IS 'Boolean (0/1): Patient has given consent for treatment';
COMMENT ON COLUMN "patients"."hipaa_received" IS 'Boolean (0/1): HIPAA privacy notice received';
COMMENT ON COLUMN "patients"."veterans_status" IS 'Boolean (0/1): Patient is a military veteran';

-- Add comments for DME provider field
COMMENT ON COLUMN "patients"."dme_provider" IS 'DME equipment type: none, wheelchair, oxygen, bed, over bed table, pressure mattress';

-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS "idx_patients_last_name" ON "patients" ("last_name");
CREATE INDEX IF NOT EXISTS "idx_patients_first_name" ON "patients" ("first_name");
CREATE INDEX IF NOT EXISTS "idx_patients_date_of_birth" ON "patients" ("date_of_birth");
CREATE INDEX IF NOT EXISTS "idx_patients_medicare_beneficiary_id" ON "patients" ("medicare_beneficiary_id");
CREATE INDEX IF NOT EXISTS "idx_patients_medical_record_number" ON "patients" ("medical_record_number");
