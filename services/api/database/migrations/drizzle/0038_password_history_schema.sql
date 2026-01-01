-- Password History Table for HIPAA Compliance
-- Prevents password reuse by storing hashed versions of previous passwords
-- SECURITY: Only stores hashed passwords, never plain text

CREATE TABLE IF NOT EXISTS password_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS password_history_user_id_idx ON password_history(user_id);

-- Index for efficient cleanup of old entries
CREATE INDEX IF NOT EXISTS password_history_created_at_idx ON password_history(created_at);

-- Comment for documentation
COMMENT ON TABLE password_history IS 'Stores hashed versions of previous passwords to prevent reuse (HIPAA compliance)';
COMMENT ON COLUMN password_history.password_hash IS 'Argon2id hashed password - never store plain text';
