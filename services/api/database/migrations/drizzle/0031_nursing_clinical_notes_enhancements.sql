-- ============================================================================
-- Migration: Enhance nursing_clinical_notes table
-- Adds: rich text content, nurse ID reference, note status, and clinical sections
-- ============================================================================

-- Add new columns to nursing_clinical_notes table
ALTER TABLE nursing_clinical_notes
  ADD COLUMN IF NOT EXISTS patient_id BIGINT REFERENCES patients(id),
  ADD COLUMN IF NOT EXISTS note_timestamp TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS nurse_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS nurse_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS nurse_credentials VARCHAR(100),
  ADD COLUMN IF NOT EXISTS note_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS content_format VARCHAR(20) DEFAULT 'html',
  ADD COLUMN IF NOT EXISTS subjective TEXT,
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS assessment TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT,
  ADD COLUMN IF NOT EXISTS interventions TEXT,
  ADD COLUMN IF NOT EXISTS patient_response TEXT,
  ADD COLUMN IF NOT EXISTS patient_education TEXT,
  ADD COLUMN IF NOT EXISTS communication TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS signed_by_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS cosigned_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cosigned_by_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS amended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amendment_reason TEXT,
  ADD COLUMN IF NOT EXISTS amended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS amended_by_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS created_by_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS updated_by_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient_id ON nursing_clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_nurse_id ON nursing_clinical_notes(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_status ON nursing_clinical_notes(note_status);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_date ON nursing_clinical_notes(note_date);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_timestamp ON nursing_clinical_notes(note_timestamp);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_benefit_period ON nursing_clinical_notes(benefit_period_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_nursing_notes_patient_status ON nursing_clinical_notes(patient_id, note_status);
CREATE INDEX IF NOT EXISTS idx_nursing_notes_nurse_status ON nursing_clinical_notes(nurse_id, note_status);

-- Add comment for documentation
COMMENT ON TABLE nursing_clinical_notes IS 'Nursing clinical notes with rich text content, timestamp, nurse ID, and status workflow';
COMMENT ON COLUMN nursing_clinical_notes.nurse_id IS 'Reference to the nurse who authored this note';
COMMENT ON COLUMN nursing_clinical_notes.note_status IS 'Workflow status: DRAFT, IN_PROGRESS, COMPLETED, PENDING_SIGNATURE, SIGNED, AMENDED, VOID';
COMMENT ON COLUMN nursing_clinical_notes.content IS 'Rich text content (HTML/JSON format) for the clinical note';
COMMENT ON COLUMN nursing_clinical_notes.content_format IS 'Format of content field: html, json, or markdown';
