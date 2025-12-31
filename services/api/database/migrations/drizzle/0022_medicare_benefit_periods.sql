-- Migration: 0022_medicare_benefit_periods.sql
-- Date: 2025-12-30
-- Description: Enhanced Medicare hospice benefit periods with level of care tracking
--
-- Medicare hospice benefit structure:
-- - First certification period: 90 days
-- - Second certification period: 90 days
-- - Subsequent certification periods: Unlimited 60-day periods
--
-- Level of Care (LOC) types:
-- - RHC (Routine Home Care) - Revenue Code 0651
-- - CHC (Continuous Home Care) - Revenue Code 0652
-- - GIP (General Inpatient Care) - Revenue Code 0655
-- - IRC (Inpatient Respite Care) - Revenue Code 0656
--
-- Compliance: CMS hospice benefit requirements, 42 CFR 418

-- =====================================================
-- STEP 1: Add new columns to existing benefit_periods table
-- =====================================================

-- Add period_type column (required for Medicare compliance)
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "period_type" varchar(50);

-- Update period_type based on period_number for existing records
UPDATE "benefit_periods" SET "period_type" =
  CASE
    WHEN "period_number" = 1 THEN 'INITIAL_90'
    WHEN "period_number" = 2 THEN 'SUBSEQUENT_90'
    ELSE 'SUBSEQUENT_60'
  END
WHERE "period_type" IS NULL;

-- Make period_type and period_number NOT NULL after migration
ALTER TABLE "benefit_periods" ALTER COLUMN "period_type" SET NOT NULL;
ALTER TABLE "benefit_periods" ALTER COLUMN "period_number" SET NOT NULL;

-- Change date columns from timestamp to date for better date handling
ALTER TABLE "benefit_periods" ALTER COLUMN "start_date" TYPE date USING "start_date"::date;
ALTER TABLE "benefit_periods" ALTER COLUMN "end_date" TYPE date USING "end_date"::date;
ALTER TABLE "benefit_periods" ALTER COLUMN "start_date" SET NOT NULL;
ALTER TABLE "benefit_periods" ALTER COLUMN "end_date" SET NOT NULL;

-- Add election information
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "election_date" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "election_statement_signed" boolean DEFAULT false;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "election_statement_date" date;

-- Add certification information
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "certification_date" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "certifying_physician_id" bigint;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "recertification_required_by" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "face_to_face_required" boolean DEFAULT false;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "face_to_face_completed" boolean DEFAULT false;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "face_to_face_date" date;

-- Add revocation/discharge information
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "revocation_date" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "revocation_reason" varchar(100);
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "discharge_date" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "discharge_reason" text;

-- Add status tracking
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL;

-- Add terminal prognosis attestation
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "terminal_prognosis_confirmed" boolean DEFAULT false;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "prognosis_6_months_or_less" boolean DEFAULT false;

-- Add NOE tracking
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "noe_filed" boolean DEFAULT false;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "noe_filed_date" date;
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "noe_timely" boolean;

-- Add notes field
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "notes" text;

-- Add audit fields
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "created_by_id" text REFERENCES "users"("id");
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "updated_by_id" text REFERENCES "users"("id");
ALTER TABLE "benefit_periods" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Add foreign key constraint for patient_id
DO $$ BEGIN
  ALTER TABLE "benefit_periods" ADD CONSTRAINT "benefit_periods_patient_id_fkey"
    FOREIGN KEY ("patient_id") REFERENCES "patients"("id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for benefit_periods
CREATE INDEX IF NOT EXISTS "idx_benefit_periods_patient_id" ON "benefit_periods"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_benefit_periods_status" ON "benefit_periods"("status");
CREATE INDEX IF NOT EXISTS "idx_benefit_periods_start_date" ON "benefit_periods"("start_date");
CREATE INDEX IF NOT EXISTS "idx_benefit_periods_patient_status" ON "benefit_periods"("patient_id", "status");

-- =====================================================
-- STEP 2: Create benefit_period_loc table (Level of Care tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS "benefit_period_loc" (
  "id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  "benefit_period_id" bigint NOT NULL REFERENCES "benefit_periods"("id"),
  "patient_id" bigint NOT NULL REFERENCES "patients"("id"),

  -- Level of care details
  "level_of_care" varchar(50) NOT NULL, -- RHC, CHC, GIP, IRC
  "revenue_code" varchar(4) NOT NULL, -- 0651, 0652, 0655, 0656

  -- LOC period dates
  "effective_date" date NOT NULL,
  "end_date" date,

  -- CHC specific fields (requires 8+ hours of care)
  "chc_start_time" timestamp,
  "chc_end_time" timestamp,
  "chc_total_hours" integer,

  -- GIP/IRC specific fields
  "facility_id" bigint,
  "facility_name" varchar(255),
  "facility_npi" varchar(10),

  -- IRC specific - limited to 5 consecutive days per benefit period
  "respite_day_count" integer,

  -- Crisis reason for CHC
  "crisis_reason" text,

  -- Physician order
  "physician_order_date" date,
  "ordering_physician_id" bigint,

  -- Status
  "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,

  "notes" text,

  -- Audit fields
  "created_by_id" text REFERENCES "users"("id"),
  "updated_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for benefit_period_loc
CREATE INDEX IF NOT EXISTS "idx_benefit_period_loc_benefit_period" ON "benefit_period_loc"("benefit_period_id");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_loc_patient" ON "benefit_period_loc"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_loc_loc" ON "benefit_period_loc"("level_of_care");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_loc_effective_date" ON "benefit_period_loc"("effective_date");

-- Add comments for documentation
COMMENT ON TABLE "benefit_period_loc" IS 'Tracks level of care changes within a benefit period for hospice billing';
COMMENT ON COLUMN "benefit_period_loc"."level_of_care" IS 'RHC=Routine Home Care, CHC=Continuous Home Care, GIP=General Inpatient, IRC=Inpatient Respite Care';
COMMENT ON COLUMN "benefit_period_loc"."revenue_code" IS 'Medicare revenue codes: 0651=RHC, 0652=CHC, 0655=GIP, 0656=IRC';
COMMENT ON COLUMN "benefit_period_loc"."chc_total_hours" IS 'Total nursing/aide hours for CHC (minimum 8 hours required)';
COMMENT ON COLUMN "benefit_period_loc"."respite_day_count" IS 'IRC limited to 5 consecutive days per benefit period';

-- =====================================================
-- STEP 3: Create benefit_period_elections table (Election history)
-- =====================================================

CREATE TABLE IF NOT EXISTS "benefit_period_elections" (
  "id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  "patient_id" bigint NOT NULL REFERENCES "patients"("id"),
  "benefit_period_id" bigint REFERENCES "benefit_periods"("id"),

  -- Election type
  "election_type" varchar(50) NOT NULL, -- INITIAL_ELECTION, RE_ELECTION, REVOCATION, TRANSFER_IN, TRANSFER_OUT

  -- Election dates
  "election_date" date NOT NULL,
  "effective_date" date NOT NULL,

  -- Statement details
  "election_statement_signed" boolean DEFAULT false,
  "election_statement_date" date,
  "witness_name" varchar(255),
  "witness_signature_date" date,

  -- Designated hospice
  "hospice_provider_name" varchar(255),
  "hospice_provider_npi" varchar(10),

  -- Attending physician acknowledgment
  "attending_physician_id" bigint,
  "attending_physician_name" varchar(255),
  "physician_acknowledgment_date" date,

  -- Revocation specific fields
  "revocation_effective_date" date,
  "revocation_reason" varchar(100),
  "remaining_days_in_period" integer,

  -- Transfer specific fields
  "transfer_from_hospice" varchar(255),
  "transfer_to_hospice" varchar(255),
  "transfer_date" date,

  "notes" text,

  -- Audit fields
  "created_by_id" text REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for benefit_period_elections
CREATE INDEX IF NOT EXISTS "idx_benefit_period_elections_patient" ON "benefit_period_elections"("patient_id");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_elections_benefit_period" ON "benefit_period_elections"("benefit_period_id");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_elections_type" ON "benefit_period_elections"("election_type");
CREATE INDEX IF NOT EXISTS "idx_benefit_period_elections_date" ON "benefit_period_elections"("election_date");

-- Add comments for documentation
COMMENT ON TABLE "benefit_period_elections" IS 'Tracks hospice election, revocation, and re-election history for compliance';
COMMENT ON COLUMN "benefit_period_elections"."election_type" IS 'INITIAL_ELECTION, RE_ELECTION, REVOCATION, TRANSFER_IN, TRANSFER_OUT';
COMMENT ON COLUMN "benefit_period_elections"."remaining_days_in_period" IS 'Days remaining in benefit period when patient revokes (forfeited days)';

-- =====================================================
-- STEP 4: Add comments to benefit_periods table
-- =====================================================

COMMENT ON TABLE "benefit_periods" IS 'Medicare hospice benefit periods with certification tracking';
COMMENT ON COLUMN "benefit_periods"."period_type" IS 'INITIAL_90 (1st 90-day), SUBSEQUENT_90 (2nd 90-day), SUBSEQUENT_60 (unlimited 60-day periods)';
COMMENT ON COLUMN "benefit_periods"."status" IS 'ACTIVE, REVOKED, DISCHARGED, EXPIRED, PENDING';
COMMENT ON COLUMN "benefit_periods"."face_to_face_required" IS 'Required for 3rd and subsequent benefit periods per CMS';
COMMENT ON COLUMN "benefit_periods"."noe_timely" IS 'NOE must be filed within 5 calendar days of election date';
