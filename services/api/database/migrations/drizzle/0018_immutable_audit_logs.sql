-- Migration: Enhance audit_logs table for HIPAA-compliant immutable audit logging
-- This migration adds new fields for comprehensive audit tracking and removes updated_at
-- to enforce immutability (audit logs should never be modified after creation)

-- Step 1: Create the audit_log_status enum type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_status') THEN
        CREATE TYPE audit_log_status AS ENUM ('success', 'failure', 'pending');
    END IF;
END$$;

-- Step 2: Add new columns to audit_logs table
-- session_id: Links to user session for traceability
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- request_id: Unique identifier for distributed tracing and log correlation
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS request_id VARCHAR(36);

-- resource_type: Renamed from table_name for clarity (we'll migrate data later)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type VARCHAR(255);

-- resource_id: Changed from bigint to text to support various ID formats
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id_new TEXT;

-- status: Operation outcome tracking
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS status audit_log_status DEFAULT 'success' NOT NULL;

-- metadata: Flexible JSON field for additional context
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Step 3: Migrate existing data
-- Copy table_name to resource_type
UPDATE audit_logs SET resource_type = table_name WHERE resource_type IS NULL AND table_name IS NOT NULL;

-- Copy record_id to resource_id_new (as text)
UPDATE audit_logs SET resource_id_new = record_id::TEXT WHERE resource_id_new IS NULL AND record_id IS NOT NULL;

-- Step 4: Add NOT NULL constraint to resource_type after data migration
-- First ensure all rows have a value
UPDATE audit_logs SET resource_type = 'unknown' WHERE resource_type IS NULL;
ALTER TABLE audit_logs ALTER COLUMN resource_type SET NOT NULL;

-- Step 5: Add foreign key constraint for session_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'audit_logs_session_id_sessions_id_fk'
    ) THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_session_id_sessions_id_fk
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add session_id foreign key constraint: %', SQLERRM;
END$$;

-- Step 6: Drop old columns that are no longer needed
-- Drop table_name (replaced by resource_type)
ALTER TABLE audit_logs DROP COLUMN IF EXISTS table_name;

-- Drop record_id (replaced by resource_id_new)
ALTER TABLE audit_logs DROP COLUMN IF EXISTS record_id;

-- Rename resource_id_new to resource_id
ALTER TABLE audit_logs RENAME COLUMN resource_id_new TO resource_id;

-- Step 7: Drop updated_at column to enforce immutability
-- IMPORTANT: Audit logs should NEVER be modified after creation (HIPAA requirement)
ALTER TABLE audit_logs DROP COLUMN IF EXISTS updated_at;

-- Step 8: Adjust user_agent column to TEXT for longer values
ALTER TABLE audit_logs ALTER COLUMN user_agent TYPE TEXT;

-- Step 9: Adjust ip_address column to support IPv6 (max 45 chars)
ALTER TABLE audit_logs ALTER COLUMN ip_address TYPE VARCHAR(45);

-- Step 10: Rename created_at column for consistency (if using old naming)
-- Check if we need to rename createdAt to created_at
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'audit_logs' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE audit_logs RENAME COLUMN "createdAt" TO created_at;
    END IF;
END$$;

-- Step 11: Create new indexes for the enhanced audit_logs table
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_history ON audit_logs(resource_type, resource_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_resource ON audit_logs(action, resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_time ON audit_logs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_time ON audit_logs(session_id, created_at);

-- Step 12: Drop old indexes that reference removed columns
DROP INDEX IF EXISTS idx_audit_logs_table_name;
DROP INDEX IF EXISTS idx_audit_logs_record_id;
DROP INDEX IF EXISTS idx_audit_logs_table_record;
DROP INDEX IF EXISTS idx_audit_logs_action_table;

-- Step 13: Add a database rule to prevent updates (enforce immutability)
-- This creates a trigger that prevents any UPDATE operations on audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_log_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be updated. This is a HIPAA compliance requirement.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_log_update_trigger ON audit_logs;
CREATE TRIGGER prevent_audit_log_update_trigger
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_update();

-- Step 14: Add a database rule to prevent deletes (enforce immutability)
-- Note: In production, you may want to allow archival/deletion by specific admin roles
-- For now, we prevent all deletes to ensure HIPAA compliance
CREATE OR REPLACE FUNCTION prevent_audit_log_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be deleted. This is a HIPAA compliance requirement.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_log_delete_trigger ON audit_logs;
CREATE TRIGGER prevent_audit_log_delete_trigger
    BEFORE DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_log_delete();

-- Add comment to table explaining immutability
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant immutable audit log. Records cannot be updated or deleted. Retention period: minimum 6 years per HIPAA requirements.';
