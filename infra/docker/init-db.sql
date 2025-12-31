-- Chartwarden Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT ALL PRIVILEGES ON DATABASE chartwarden TO chartwarden;
DO $$ BEGIN RAISE NOTICE 'Chartwarden database initialized successfully'; END $$;
