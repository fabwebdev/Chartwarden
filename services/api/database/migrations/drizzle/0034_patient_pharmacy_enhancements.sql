-- Patient Pharmacy Schema Enhancements
-- Adds NPI (National Provider Identifier), DEA number, and additional pharmacy fields
-- Required for HIPAA compliance, Medicare Part D, and e-prescribing

-- Add new columns to patient_pharmacies table
ALTER TABLE patient_pharmacies
ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'USA',
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS npi VARCHAR(10),
ADD COLUMN IF NOT EXISTS dea_number VARCHAR(9),
ADD COLUMN IF NOT EXISTS pharmacy_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS operating_hours TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_24_hour BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS accepts_medicare BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS accepts_medicaid BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS delivers_medications BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update existing columns with reasonable constraints
ALTER TABLE patient_pharmacies
ALTER COLUMN state TYPE VARCHAR(2);

ALTER TABLE patient_pharmacies
ALTER COLUMN zip_code TYPE VARCHAR(10);

ALTER TABLE patient_pharmacies
ALTER COLUMN phone TYPE VARCHAR(20);

ALTER TABLE patient_pharmacies
ALTER COLUMN fax TYPE VARCHAR(20);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patient_pharmacies_npi ON patient_pharmacies(npi);
CREATE INDEX IF NOT EXISTS idx_patient_pharmacies_name ON patient_pharmacies(name);
CREATE INDEX IF NOT EXISTS idx_patient_pharmacies_is_active ON patient_pharmacies(is_active);
CREATE INDEX IF NOT EXISTS idx_patient_pharmacies_city_state ON patient_pharmacies(city, state);
CREATE INDEX IF NOT EXISTS idx_patient_pharmacies_pharmacy_type ON patient_pharmacies(pharmacy_type);

-- Add comments for documentation
COMMENT ON TABLE patient_pharmacies IS 'Preferred pharmacy information for patients including NPI for e-prescribing and DEA for controlled substances';
COMMENT ON COLUMN patient_pharmacies.npi IS 'National Provider Identifier - 10-digit unique identifier required for Medicare claims and e-prescribing';
COMMENT ON COLUMN patient_pharmacies.dea_number IS 'DEA Registration Number - 9-character identifier required for dispensing controlled substances';
COMMENT ON COLUMN patient_pharmacies.pharmacy_type IS 'Classification: RETAIL, MAIL_ORDER, SPECIALTY, COMPOUNDING, HOSPITAL, CLINIC, LONG_TERM_CARE, NUCLEAR, HOME_INFUSION, OTHER';
COMMENT ON COLUMN patient_pharmacies.operating_hours IS 'JSON string containing operating hours by day of week';
COMMENT ON COLUMN patient_pharmacies.accepts_medicare IS 'Whether pharmacy accepts Medicare Part D';
COMMENT ON COLUMN patient_pharmacies.accepts_medicaid IS 'Whether pharmacy accepts Medicaid';
COMMENT ON COLUMN patient_pharmacies.delivers_medications IS 'Whether pharmacy offers medication delivery service';
