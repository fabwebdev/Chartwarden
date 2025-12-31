-- Migration: 0021_user_roles_permissions_schema
-- Description: Enhance users, roles, permissions schemas with HIPAA compliance fields,
--              hierarchy support, resource-based permissions, and proper foreign key relationships

-- ============================================
-- USERS TABLE ENHANCEMENTS
-- ============================================

-- Add HIPAA compliance fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_changed_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" varchar(10) DEFAULT '0';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_until" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;

-- Create indexes for users table
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_is_active_idx" ON "users" ("is_active");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");

-- ============================================
-- ROLES TABLE ENHANCEMENTS
-- ============================================

-- Add new columns to roles table
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "display_name" varchar(255);
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "hierarchy_level" integer DEFAULT 100 NOT NULL;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;

-- Create indexes for roles table
CREATE INDEX IF NOT EXISTS "roles_name_idx" ON "roles" ("name");
CREATE INDEX IF NOT EXISTS "roles_hierarchy_level_idx" ON "roles" ("hierarchy_level");
CREATE INDEX IF NOT EXISTS "roles_is_active_idx" ON "roles" ("is_active");

-- ============================================
-- PERMISSIONS TABLE ENHANCEMENTS
-- ============================================

-- Add resource-based permission columns
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "resource" varchar(100);
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "action" varchar(50);
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "permissions" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;

-- Update existing permissions to have resource/action values based on name
-- This is a safe update that parses permission names like "create_patients" into resource/action
UPDATE "permissions"
SET
  "resource" = CASE
    WHEN "name" LIKE '%_patients%' THEN 'patients'
    WHEN "name" LIKE '%_encounters%' THEN 'encounters'
    WHEN "name" LIKE '%_medications%' THEN 'medications'
    WHEN "name" LIKE '%_users%' THEN 'users'
    WHEN "name" LIKE '%_roles%' THEN 'roles'
    WHEN "name" LIKE '%_permissions%' THEN 'permissions'
    WHEN "name" LIKE '%_billing%' THEN 'billing'
    WHEN "name" LIKE '%_reports%' THEN 'reports'
    ELSE COALESCE(SPLIT_PART("name", '_', 2), 'system')
  END,
  "action" = CASE
    WHEN "name" LIKE 'create_%' THEN 'create'
    WHEN "name" LIKE 'read_%' OR "name" LIKE 'view_%' THEN 'read'
    WHEN "name" LIKE 'update_%' OR "name" LIKE 'edit_%' THEN 'update'
    WHEN "name" LIKE 'delete_%' THEN 'delete'
    WHEN "name" LIKE 'manage_%' THEN 'manage'
    ELSE COALESCE(SPLIT_PART("name", '_', 1), 'read')
  END
WHERE "resource" IS NULL OR "action" IS NULL;

-- Set NOT NULL constraint after updating existing records (with defaults for any nulls)
UPDATE "permissions" SET "resource" = 'system' WHERE "resource" IS NULL;
UPDATE "permissions" SET "action" = 'read' WHERE "action" IS NULL;
ALTER TABLE "permissions" ALTER COLUMN "resource" SET NOT NULL;
ALTER TABLE "permissions" ALTER COLUMN "action" SET NOT NULL;

-- Create indexes for permissions table
CREATE INDEX IF NOT EXISTS "permissions_name_idx" ON "permissions" ("name");
CREATE INDEX IF NOT EXISTS "permissions_resource_idx" ON "permissions" ("resource");
CREATE INDEX IF NOT EXISTS "permissions_action_idx" ON "permissions" ("action");
CREATE UNIQUE INDEX IF NOT EXISTS "permissions_resource_action_idx" ON "permissions" ("resource", "action");

-- ============================================
-- USER_HAS_ROLES TABLE ENHANCEMENTS
-- ============================================

-- Add audit columns to user_has_roles
ALTER TABLE "user_has_roles" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp DEFAULT NOW() NOT NULL;
ALTER TABLE "user_has_roles" ADD COLUMN IF NOT EXISTS "assigned_by" text;

-- Add foreign key constraints (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_has_roles_user_id_fkey'
    AND table_name = 'user_has_roles'
  ) THEN
    ALTER TABLE "user_has_roles"
    ADD CONSTRAINT "user_has_roles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_has_roles_role_id_fkey'
    AND table_name = 'user_has_roles'
  ) THEN
    ALTER TABLE "user_has_roles"
    ADD CONSTRAINT "user_has_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_has_roles_assigned_by_fkey'
    AND table_name = 'user_has_roles'
  ) THEN
    ALTER TABLE "user_has_roles"
    ADD CONSTRAINT "user_has_roles_assigned_by_fkey"
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for user_has_roles
CREATE INDEX IF NOT EXISTS "user_has_roles_user_id_idx" ON "user_has_roles" ("user_id");
CREATE INDEX IF NOT EXISTS "user_has_roles_role_id_idx" ON "user_has_roles" ("role_id");

-- ============================================
-- ROLE_HAS_PERMISSIONS TABLE ENHANCEMENTS
-- ============================================

-- Add audit columns to role_has_permissions
ALTER TABLE "role_has_permissions" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp DEFAULT NOW() NOT NULL;
ALTER TABLE "role_has_permissions" ADD COLUMN IF NOT EXISTS "assigned_by" text;

-- Add foreign key constraints (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_has_permissions_permission_id_fkey'
    AND table_name = 'role_has_permissions'
  ) THEN
    ALTER TABLE "role_has_permissions"
    ADD CONSTRAINT "role_has_permissions_permission_id_fkey"
    FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_has_permissions_role_id_fkey'
    AND table_name = 'role_has_permissions'
  ) THEN
    ALTER TABLE "role_has_permissions"
    ADD CONSTRAINT "role_has_permissions_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'role_has_permissions_assigned_by_fkey'
    AND table_name = 'role_has_permissions'
  ) THEN
    ALTER TABLE "role_has_permissions"
    ADD CONSTRAINT "role_has_permissions_assigned_by_fkey"
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for role_has_permissions
CREATE INDEX IF NOT EXISTS "role_has_permissions_permission_id_idx" ON "role_has_permissions" ("permission_id");
CREATE INDEX IF NOT EXISTS "role_has_permissions_role_id_idx" ON "role_has_permissions" ("role_id");

-- ============================================
-- MODEL_HAS_ROLES TABLE ENHANCEMENTS
-- ============================================

-- Add audit columns to model_has_roles
ALTER TABLE "model_has_roles" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp DEFAULT NOW() NOT NULL;
ALTER TABLE "model_has_roles" ADD COLUMN IF NOT EXISTS "assigned_by" text;

-- Add foreign key constraints (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'model_has_roles_role_id_fkey'
    AND table_name = 'model_has_roles'
  ) THEN
    ALTER TABLE "model_has_roles"
    ADD CONSTRAINT "model_has_roles_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'model_has_roles_assigned_by_fkey'
    AND table_name = 'model_has_roles'
  ) THEN
    ALTER TABLE "model_has_roles"
    ADD CONSTRAINT "model_has_roles_assigned_by_fkey"
    FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for model_has_roles
CREATE INDEX IF NOT EXISTS "model_has_roles_role_id_idx" ON "model_has_roles" ("role_id");
CREATE INDEX IF NOT EXISTS "model_has_roles_model_type_idx" ON "model_has_roles" ("model_type");
CREATE INDEX IF NOT EXISTS "model_has_roles_model_id_idx" ON "model_has_roles" ("model_id");

-- ============================================
-- SEED DEFAULT SYSTEM ROLES
-- ============================================

-- Insert default system roles if they don't exist
INSERT INTO "roles" ("name", "display_name", "description", "guard_name", "hierarchy_level", "is_active", "is_system")
VALUES
  ('admin', 'Administrator', 'Full system access with all permissions', 'web', 1, true, true),
  ('medical_director', 'Medical Director', 'Oversees all clinical operations and has access to all patient data', 'web', 5, true, true),
  ('physician', 'Physician', 'Attending physician with full clinical documentation access', 'web', 10, true, true),
  ('registered_nurse', 'Registered Nurse', 'RN with patient care and documentation access', 'web', 20, true, true),
  ('licensed_practical_nurse', 'Licensed Practical Nurse', 'LPN with supervised patient care access', 'web', 25, true, true),
  ('certified_nursing_assistant', 'Certified Nursing Assistant', 'CNA with basic patient care access', 'web', 30, true, true),
  ('social_worker', 'Social Worker', 'Social worker with psychosocial assessment access', 'web', 20, true, true),
  ('chaplain', 'Chaplain', 'Spiritual care provider with limited patient access', 'web', 25, true, true),
  ('scheduler', 'Scheduler', 'Scheduling staff with visit and staff management access', 'web', 50, true, true),
  ('billing', 'Billing Staff', 'Billing department with claims and financial access', 'web', 40, true, true),
  ('patient', 'Patient', 'Patient with access to their own records', 'web', 100, true, true)
ON CONFLICT ("name") DO UPDATE SET
  "display_name" = EXCLUDED."display_name",
  "description" = EXCLUDED."description",
  "hierarchy_level" = EXCLUDED."hierarchy_level",
  "is_system" = EXCLUDED."is_system";

-- ============================================
-- SEED DEFAULT PERMISSIONS
-- ============================================

-- Insert default permissions for core resources
INSERT INTO "permissions" ("name", "resource", "action", "description", "guard_name", "is_active")
VALUES
  -- Patient permissions
  ('patients.create', 'patients', 'create', 'Create new patient records', 'web', true),
  ('patients.read', 'patients', 'read', 'View patient records', 'web', true),
  ('patients.update', 'patients', 'update', 'Update patient records', 'web', true),
  ('patients.delete', 'patients', 'delete', 'Delete patient records', 'web', true),
  ('patients.manage', 'patients', 'manage', 'Full management of patient records', 'web', true),

  -- Encounter permissions
  ('encounters.create', 'encounters', 'create', 'Create new encounters/visits', 'web', true),
  ('encounters.read', 'encounters', 'read', 'View encounter records', 'web', true),
  ('encounters.update', 'encounters', 'update', 'Update encounter records', 'web', true),
  ('encounters.delete', 'encounters', 'delete', 'Delete encounter records', 'web', true),
  ('encounters.sign', 'encounters', 'sign', 'Sign encounter documentation', 'web', true),
  ('encounters.cosign', 'encounters', 'cosign', 'Co-sign encounter documentation', 'web', true),

  -- Medication permissions
  ('medications.create', 'medications', 'create', 'Add medications to patient records', 'web', true),
  ('medications.read', 'medications', 'read', 'View medication records', 'web', true),
  ('medications.update', 'medications', 'update', 'Update medication records', 'web', true),
  ('medications.delete', 'medications', 'delete', 'Delete medication records', 'web', true),
  ('medications.administer', 'medications', 'administer', 'Administer medications (MAR)', 'web', true),

  -- User management permissions
  ('users.create', 'users', 'create', 'Create new user accounts', 'web', true),
  ('users.read', 'users', 'read', 'View user accounts', 'web', true),
  ('users.update', 'users', 'update', 'Update user accounts', 'web', true),
  ('users.delete', 'users', 'delete', 'Delete user accounts', 'web', true),
  ('users.manage', 'users', 'manage', 'Full management of user accounts', 'web', true),

  -- Role management permissions
  ('roles.create', 'roles', 'create', 'Create new roles', 'web', true),
  ('roles.read', 'roles', 'read', 'View roles', 'web', true),
  ('roles.update', 'roles', 'update', 'Update roles', 'web', true),
  ('roles.delete', 'roles', 'delete', 'Delete roles', 'web', true),
  ('roles.assign', 'roles', 'assign', 'Assign roles to users', 'web', true),

  -- Permission management
  ('permissions.read', 'permissions', 'read', 'View permissions', 'web', true),
  ('permissions.assign', 'permissions', 'assign', 'Assign permissions to roles', 'web', true),

  -- Billing permissions
  ('billing.create', 'billing', 'create', 'Create billing records and claims', 'web', true),
  ('billing.read', 'billing', 'read', 'View billing records', 'web', true),
  ('billing.update', 'billing', 'update', 'Update billing records', 'web', true),
  ('billing.submit', 'billing', 'submit', 'Submit claims for processing', 'web', true),

  -- Reports permissions
  ('reports.read', 'reports', 'read', 'View reports', 'web', true),
  ('reports.create', 'reports', 'create', 'Generate reports', 'web', true),
  ('reports.export', 'reports', 'export', 'Export reports', 'web', true),

  -- Audit log permissions
  ('audit_logs.read', 'audit_logs', 'read', 'View audit logs', 'web', true),

  -- System settings
  ('settings.read', 'settings', 'read', 'View system settings', 'web', true),
  ('settings.update', 'settings', 'update', 'Update system settings', 'web', true)
ON CONFLICT ("name") DO UPDATE SET
  "resource" = EXCLUDED."resource",
  "action" = EXCLUDED."action",
  "description" = EXCLUDED."description";
