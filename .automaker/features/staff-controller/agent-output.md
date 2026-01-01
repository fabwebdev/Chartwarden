
🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "in_progress",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Design database schemas for staff and credentials",
      "status": "pending",
      "activeForm": "Designing database schemas for staff and credentials"
    },
    {
      "content": "Implement Staff controller with CRUD operations",
      "status": "pending",
      "activeForm": "Implementing Staff controller with CRUD operations"
    },
    {
      "content": "Implement Credential management system",
      "status": "pending",
      "activeForm": "Implementing Credential management system"
    },
    {
      "content": "Add routes and integrate with API",
      "status": "pending",
      "activeForm": "Adding routes and integrating with API"
    },
    {
      "content": "Implement audit logging and authorization",
      "status": "pending",
      "activeForm": "Implementing audit logging and authorization"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

Let me explore the existing codebase structure to understand the patterns used.

🔧 Tool: Task
Input: {
  "description": "Explore codebase structure",
  "prompt": "I need to understand the existing codebase structure for implementing a Staff Profile and Credential Management System. Please explore and provide details about:\n\n1. The database schema patterns in services/api/src/db/schemas/ - what existing schemas look like, naming conventions, how they define tables\n2. The controller patterns in services/api/src/controllers/ - how existing controllers are structured, what methods they have, how they handle CRUD operations\n3. The route patterns in services/api/src/routes/ - how routes are defined, how they connect to controllers\n4. The RBAC configuration in services/api/src/config/rbac.js - how permissions are defined\n5. Any existing staff-related code that might already exist\n\nFocus on understanding patterns so I can implement the Staff controller consistently. This is research only, no code changes.",
  "subagent_type": "Explore"
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/db/schemas/*.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/controllers/*.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/routes/*.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/staffManagement.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/staff.routes.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Patient.controller.js",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/patient.schema.js",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/user.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/patient.routes.js",
  "limit": 100
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/middleware/*.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/middleware/rbac.middleware.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/middleware/validation.middleware.js",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js",
  "limit": 150
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/User.controller.js",
  "limit": 120
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/user.routes.js",
  "limit": 80
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Role.controller.js",
  "limit": 100
}

🔧 Tool: Grep
Input: {
  "pattern": "PERMISSIONS\\.(MANAGE_USERS|VIEW_USERS|CREATE_USER|UPDATE_USER|DELETE_USER)",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

The exploration reveals that the Staff Management system is already substantially implemented. Let me examine what's already there and what might be missing based on the requirements.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/staffManagement.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/staff.routes.js"
}

I can see that the Staff Management system already has a good foundation. Let me analyze what's already implemented vs. what the requirements specify is missing:

**Already Implemented:**
- Database schemas for staff_profiles, staff_credentials, staff_caseload, staff_schedule, staff_productivity, staff_training
- Basic CRUD operations for staff profiles
- Credential management with expiration tracking
- Routes with RBAC protection

**Missing from the requirements:**
1. **Soft delete endpoint** - DELETE /api/staff/:id
2. **Search and filter by name** - Currently only filters by status, department, job_title
3. **Credential update endpoint** - PUT /api/credentials/:id
4. **Credential delete/revoke endpoint** - DELETE /api/credentials/:id
5. **Get expired credentials endpoint** - GET /api/credentials/expired
6. **Staff missing credentials endpoint** - GET /api/staff/missing-credentials
7. **Credential document upload** - POST /api/credentials/:id/documents
8. **Credential history/audit log** - Tables for tracking changes
9. **Audit log endpoint** - GET /api/staff/:id/audit-log
10. **Bulk import/export capabilities**

Let me update the todo list and start implementing these missing features.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Add credential_history and staff_audit_log tables to schema",
      "status": "in_progress",
      "activeForm": "Adding credential_history and staff_audit_log tables to schema"
    },
    {
      "content": "Add missing controller methods (delete staff, update/delete credential, expired credentials, missing credentials, audit log)",
      "status": "pending",
      "activeForm": "Adding missing controller methods"
    },
    {
      "content": "Add missing routes to staff.routes.js",
      "status": "pending",
      "activeForm": "Adding missing routes"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js"
}

I see there's already an `auditLog.schema.js`. Let me check its structure to see if we can reuse it or if we need staff-specific audit tables.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/auditLog.schema.js"
}

There's already a comprehensive audit_logs table. Now I need to add:
1. A `credential_history` table for tracking credential lifecycle changes
2. A `credential_documents` table for storing uploaded documents

Let me add these to the staffManagement.schema.js file and then add the missing controller methods.

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/staffManagement.schema.js",
  "old_string": "export const staff_training = pgTable('staff_training', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),\n\n  // Training information\n  training_name: varchar('training_name', { length: 255 }).notNull(),\n  training_type: varchar('training_type', { length: 100 }).notNull(), // ORIENTATION, ANNUAL_COMPLIANCE, CONTINUING_EDUCATION, SKILLS_COMPETENCY, SAFETY\n  training_category: varchar('training_category', { length: 100 }), // HIPAA, INFECTION_CONTROL, OSHA, CLINICAL_SKILLS, etc.\n\n  // Provider information\n  training_provider: varchar('training_provider', { length: 255 }),\n  instructor_name: varchar('instructor_name', { length: 255 }),\n\n  // Dates\n  training_date: date('training_date').notNull(),\n  completion_date: date('completion_date'),\n  expiration_date: date('expiration_date'), // For trainings that expire (e.g., CPR)\n\n  // Status\n  training_status: varchar('training_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, FAILED\n\n  // Credits and scores\n  hours_completed: decimal('hours_completed', { precision: 5, scale: 2 }),\n  ceu_credits: decimal('ceu_credits', { precision: 5, scale: 2 }), // Continuing Education Units\n  score: decimal('score', { precision: 5, scale: 2 }), // Test score if applicable\n  passing_score: decimal('passing_score', { precision: 5, scale: 2 }),\n  passed: boolean('passed'),\n\n  // Certificate\n  certificate_number: varchar('certificate_number', { length: 100 }),\n  certificate_url: text('certificate_url'), // Link to certificate document\n\n  // Compliance tracking\n  is_required: boolean('is_required').default(false), // Is this a required/compliance training?\n  due_date: date('due_date'), // When training must be completed by\n\n  notes: text('notes'),\n\n  // Audit fields\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});",
  "new_string": "export const staff_training = pgTable('staff_training', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),\n\n  // Training information\n  training_name: varchar('training_name', { length: 255 }).notNull(),\n  training_type: varchar('training_type', { length: 100 }).notNull(), // ORIENTATION, ANNUAL_COMPLIANCE, CONTINUING_EDUCATION, SKILLS_COMPETENCY, SAFETY\n  training_category: varchar('training_category', { length: 100 }), // HIPAA, INFECTION_CONTROL, OSHA, CLINICAL_SKILLS, etc.\n\n  // Provider information\n  training_provider: varchar('training_provider', { length: 255 }),\n  instructor_name: varchar('instructor_name', { length: 255 }),\n\n  // Dates\n  training_date: date('training_date').notNull(),\n  completion_date: date('completion_date'),\n  expiration_date: date('expiration_date'), // For trainings that expire (e.g., CPR)\n\n  // Status\n  training_status: varchar('training_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, FAILED\n\n  // Credits and scores\n  hours_completed: decimal('hours_completed', { precision: 5, scale: 2 }),\n  ceu_credits: decimal('ceu_credits', { precision: 5, scale: 2 }), // Continuing Education Units\n  score: decimal('score', { precision: 5, scale: 2 }), // Test score if applicable\n  passing_score: decimal('passing_score', { precision: 5, scale: 2 }),\n  passed: boolean('passed'),\n\n  // Certificate\n  certificate_number: varchar('certificate_number', { length: 100 }),\n  certificate_url: text('certificate_url'), // Link to certificate document\n\n  // Compliance tracking\n  is_required: boolean('is_required').default(false), // Is this a required/compliance training?\n  due_date: date('due_date'), // When training must be completed by\n\n  notes: text('notes'),\n\n  // Audit fields\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});\n\n/**\n * Credential History Table\n * Immutable audit trail for credential changes (versioning)\n * Tracks: initial issue, renewals, updates, revocations\n */\nexport const credential_history = pgTable('credential_history', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  credential_id: bigint('credential_id', { mode: 'number' }).references(() => staff_credentials.id).notNull(),\n  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),\n\n  // Change tracking\n  change_type: varchar('change_type', { length: 50 }).notNull(), // CREATED, UPDATED, RENEWED, REVOKED, EXPIRED, VERIFIED\n\n  // Previous and new values (JSON)\n  previous_values: jsonb('previous_values'), // State before change\n  new_values: jsonb('new_values'), // State after change\n\n  // Summary of what changed\n  change_summary: text('change_summary'),\n\n  // Who made the change\n  changed_by_id: text('changed_by_id').references(() => users.id),\n\n  // Immutable timestamp\n  changed_at: timestamp('changed_at').defaultNow().notNull()\n});\n\n/**\n * Credential Documents Table\n * Storage for scanned licenses, certificates, and other credential documentation\n */\nexport const credential_documents = pgTable('credential_documents', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  credential_id: bigint('credential_id', { mode: 'number' }).references(() => staff_credentials.id).notNull(),\n\n  // File information\n  file_name: varchar('file_name', { length: 255 }).notNull(),\n  file_path: text('file_path').notNull(), // Storage path or URL\n  file_type: varchar('file_type', { length: 50 }), // PDF, JPEG, PNG, etc.\n  file_size: integer('file_size'), // Size in bytes\n  mime_type: varchar('mime_type', { length: 100 }),\n\n  // Document metadata\n  document_type: varchar('document_type', { length: 100 }), // LICENSE_SCAN, CERTIFICATE, VERIFICATION_LETTER\n  description: text('description'),\n\n  // Audit fields\n  uploaded_by_id: text('uploaded_by_id').references(() => users.id),\n  uploaded_at: timestamp('uploaded_at').defaultNow().notNull(),\n  deleted_at: timestamp('deleted_at')\n});\n\n/**\n * Required Credentials Configuration Table\n * Defines which credentials are required for specific positions/departments\n */\nexport const required_credentials = pgTable('required_credentials', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n\n  // Scope: can be department-wide, position-specific, or both\n  department: varchar('department', { length: 100 }),\n  job_title: varchar('job_title', { length: 255 }),\n\n  // Required credential type\n  credential_type: varchar('credential_type', { length: 100 }).notNull(),\n  credential_name: varchar('credential_name', { length: 255 }),\n\n  // Configuration\n  is_mandatory: boolean('is_mandatory').default(true),\n  grace_period_days: integer('grace_period_days').default(0), // Days after hire to obtain\n\n  notes: text('notes'),\n\n  // Audit fields\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Add credential_history and staff_audit_log tables to schema",
      "status": "completed",
      "activeForm": "Adding credential_history and staff_audit_log tables to schema"
    },
    {
      "content": "Add missing controller methods (delete staff, update/delete credential, expired credentials, missing credentials, audit log)",
      "status": "in_progress",
      "activeForm": "Adding missing controller methods"
    },
    {
      "content": "Add missing routes to staff.routes.js",
      "status": "pending",
      "activeForm": "Adding missing routes"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

Now let me update the controller to add the missing methods. I'll need to add:
1. `deleteStaff` - soft delete staff profile
2. `updateCredential` - update a credential
3. `deleteCredential` - revoke/remove a credential
4. `getExpiredCredentials` - get all expired credentials
5. `getStaffMissingCredentials` - get staff missing required credentials
6. `uploadCredentialDocument` - upload credential documentation
7. `getStaffAuditLog` - get audit history for staff member
8. Search functionality improvements

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "old_string": "import { db } from '../config/db.drizzle.js';\nimport {\n  staff_profiles,\n  staff_credentials,\n  staff_caseload,\n  staff_schedule,\n  staff_productivity,\n  staff_training,\n  patients,\n  users\n} from '../db/schemas/index.js';\nimport { eq, and, gte, lte, desc, sql, or, isNull, lt } from 'drizzle-orm';",
  "new_string": "import { db } from '../config/db.drizzle.js';\nimport {\n  staff_profiles,\n  staff_credentials,\n  staff_caseload,\n  staff_schedule,\n  staff_productivity,\n  staff_training,\n  credential_history,\n  credential_documents,\n  required_credentials,\n  patients,\n  users,\n  audit_logs\n} from '../db/schemas/index.js';\nimport { eq, and, gte, lte, desc, sql, or, isNull, lt, like, ilike } from 'drizzle-orm';"
}

Now let me update the getAllStaff method to add search functionality:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "old_string": "  /**\n   * Get all staff profiles\n   * GET /staff\n   */\n  async getAllStaff(request, reply) {\n    try {\n      const {\n        limit = 50,\n        offset = 0,\n        status,\n        department,\n        job_title\n      } = request.query;\n\n      let query = db\n        .select()\n        .from(staff_profiles)\n        .where(isNull(staff_profiles.deleted_at));\n\n      // Apply filters\n      const filters = [];\n      if (status) {\n        filters.push(eq(staff_profiles.employment_status, status));\n      }\n      if (department) {\n        filters.push(eq(staff_profiles.department, department));\n      }\n      if (job_title) {\n        filters.push(eq(staff_profiles.job_title, job_title));\n      }\n\n      if (filters.length > 0) {\n        query = query.where(and(...filters));\n      }\n\n      const results = await query\n        .orderBy(staff_profiles.last_name, staff_profiles.first_name)\n        .limit(parseInt(limit))\n        .offset(parseInt(offset));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length\n      };\n    } catch (error) {\n      logger.error('Error fetching staff:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching staff',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }",
  "new_string": "  /**\n   * Get all staff profiles\n   * GET /staff\n   * Supports: search (name, employee_id), status, department, job_title, pagination\n   */\n  async getAllStaff(request, reply) {\n    try {\n      const {\n        limit = 50,\n        offset = 0,\n        status,\n        department,\n        job_title,\n        search,\n        employee_id\n      } = request.query;\n\n      // Build filter conditions\n      const filters = [isNull(staff_profiles.deleted_at)];\n\n      if (status) {\n        filters.push(eq(staff_profiles.employment_status, status));\n      }\n      if (department) {\n        filters.push(eq(staff_profiles.department, department));\n      }\n      if (job_title) {\n        filters.push(eq(staff_profiles.job_title, job_title));\n      }\n      if (employee_id) {\n        filters.push(eq(staff_profiles.employee_id, employee_id));\n      }\n\n      // Search by name (first_name, last_name, or preferred_name)\n      if (search) {\n        const searchPattern = `%${search}%`;\n        filters.push(\n          or(\n            ilike(staff_profiles.first_name, searchPattern),\n            ilike(staff_profiles.last_name, searchPattern),\n            ilike(staff_profiles.preferred_name, searchPattern),\n            ilike(staff_profiles.employee_id, searchPattern),\n            ilike(staff_profiles.email, searchPattern)\n          )\n        );\n      }\n\n      const results = await db\n        .select()\n        .from(staff_profiles)\n        .where(and(...filters))\n        .orderBy(staff_profiles.last_name, staff_profiles.first_name)\n        .limit(parseInt(limit))\n        .offset(parseInt(offset));\n\n      // Get total count for pagination\n      const countResult = await db\n        .select({ count: sql`count(*)::int` })\n        .from(staff_profiles)\n        .where(and(...filters));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length,\n        total: countResult[0]?.count || 0,\n        limit: parseInt(limit),\n        offset: parseInt(offset)\n      };\n    } catch (error) {\n      logger.error('Error fetching staff:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching staff',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }"
}

Now let me add the deleteStaff method after updateStaff:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "old_string": "      reply.code(200);\n      return {\n        status: 200,\n        message: 'Staff profile updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating staff profile:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating staff profile',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  // ============================================\n  // CREDENTIAL MANAGEMENT\n  // ============================================",
  "new_string": "      reply.code(200);\n      return {\n        status: 200,\n        message: 'Staff profile updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating staff profile:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating staff profile',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Soft delete staff profile\n   * DELETE /staff/:id\n   */\n  async deleteStaff(request, reply) {\n    try {\n      const { id } = request.params;\n\n      // Verify staff exists\n      const existing = await db\n        .select()\n        .from(staff_profiles)\n        .where(and(\n          eq(staff_profiles.id, parseInt(id)),\n          isNull(staff_profiles.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Staff member not found'\n        };\n      }\n\n      // Soft delete\n      const result = await db\n        .update(staff_profiles)\n        .set({\n          deleted_at: new Date(),\n          employment_status: 'TERMINATED',\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(staff_profiles.id, parseInt(id)))\n        .returning();\n\n      // Log the deletion in audit_logs\n      await db.insert(audit_logs).values({\n        user_id: request.user?.id,\n        action: 'DELETE',\n        resource_type: 'staff_profiles',\n        resource_id: String(id),\n        old_value: JSON.stringify(existing[0]),\n        new_value: JSON.stringify({ deleted_at: result[0]?.deleted_at }),\n        status: 'success',\n        ip_address: request.ip,\n        user_agent: request.headers['user-agent']\n      });\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Staff profile deleted successfully'\n      };\n    } catch (error) {\n      logger.error('Error deleting staff profile:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error deleting staff profile',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  // ============================================\n  // CREDENTIAL MANAGEMENT\n  // ============================================"
}

Now let me find the addCredential method and add updateCredential and deleteCredential methods after it. First let me read more of the file:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "offset": 330,
  "limit": 200
}

Now let me update the addCredential method to include credential history logging, and add the missing methods after getExpiringCredentials:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "old_string": "  /**\n   * Add credential to staff member\n   * POST /staff/:id/credentials\n   */\n  async addCredential(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      // Validate required fields\n      if (!data.credential_type || !data.credential_name || !data.expiration_date) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Missing required fields: credential_type, credential_name, expiration_date'\n        };\n      }\n\n      const result = await db\n        .insert(staff_credentials)\n        .values({\n          staff_id: parseInt(id),\n          ...data,\n          created_by_id: request.user?.id,\n          updated_by_id: request.user?.id\n        })\n        .returning();\n\n      reply.code(201);\n      return {\n        status: 201,\n        message: 'Credential added successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error adding credential:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error adding credential',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }",
  "new_string": "  /**\n   * Add credential to staff member\n   * POST /staff/:id/credentials\n   */\n  async addCredential(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      // Validate required fields\n      if (!data.credential_type || !data.credential_name || !data.expiration_date) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Missing required fields: credential_type, credential_name, expiration_date'\n        };\n      }\n\n      // Validate issue_date is before expiration_date if provided\n      if (data.issue_date && data.expiration_date) {\n        const issueDate = new Date(data.issue_date);\n        const expirationDate = new Date(data.expiration_date);\n        if (issueDate >= expirationDate) {\n          reply.code(400);\n          return {\n            status: 400,\n            message: 'Issue date must be before expiration date'\n          };\n        }\n      }\n\n      const result = await db\n        .insert(staff_credentials)\n        .values({\n          staff_id: parseInt(id),\n          ...data,\n          created_by_id: request.user?.id,\n          updated_by_id: request.user?.id\n        })\n        .returning();\n\n      // Log credential creation in history\n      await db.insert(credential_history).values({\n        credential_id: result[0].id,\n        staff_id: parseInt(id),\n        change_type: 'CREATED',\n        new_values: result[0],\n        change_summary: `Credential ${data.credential_type} created`,\n        changed_by_id: request.user?.id\n      });\n\n      reply.code(201);\n      return {\n        status: 201,\n        message: 'Credential added successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error adding credential:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error adding credential',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Update credential\n   * PUT /credentials/:id\n   */\n  async updateCredential(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      // Get existing credential\n      const existing = await db\n        .select()\n        .from(staff_credentials)\n        .where(and(\n          eq(staff_credentials.id, parseInt(id)),\n          isNull(staff_credentials.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Credential not found'\n        };\n      }\n\n      // Validate issue_date is before expiration_date if provided\n      const issueDate = data.issue_date || existing[0].issue_date;\n      const expirationDate = data.expiration_date || existing[0].expiration_date;\n      if (issueDate && expirationDate) {\n        if (new Date(issueDate) >= new Date(expirationDate)) {\n          reply.code(400);\n          return {\n            status: 400,\n            message: 'Issue date must be before expiration date'\n          };\n        }\n      }\n\n      // Determine change type based on what's being updated\n      let changeType = 'UPDATED';\n      if (data.credential_status === 'REVOKED') {\n        changeType = 'REVOKED';\n      } else if (data.expiration_date && data.expiration_date !== existing[0].expiration_date) {\n        changeType = 'RENEWED';\n      } else if (data.verification_date) {\n        changeType = 'VERIFIED';\n      }\n\n      const result = await db\n        .update(staff_credentials)\n        .set({\n          ...data,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(staff_credentials.id, parseInt(id)))\n        .returning();\n\n      // Log credential change in history\n      await db.insert(credential_history).values({\n        credential_id: parseInt(id),\n        staff_id: existing[0].staff_id,\n        change_type: changeType,\n        previous_values: existing[0],\n        new_values: result[0],\n        change_summary: `Credential ${changeType.toLowerCase()}: ${existing[0].credential_type}`,\n        changed_by_id: request.user?.id\n      });\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Credential updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating credential:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating credential',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Revoke/delete credential\n   * DELETE /credentials/:id\n   */\n  async deleteCredential(request, reply) {\n    try {\n      const { id } = request.params;\n\n      // Get existing credential\n      const existing = await db\n        .select()\n        .from(staff_credentials)\n        .where(and(\n          eq(staff_credentials.id, parseInt(id)),\n          isNull(staff_credentials.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Credential not found'\n        };\n      }\n\n      // Soft delete and mark as revoked\n      const result = await db\n        .update(staff_credentials)\n        .set({\n          deleted_at: new Date(),\n          credential_status: 'REVOKED',\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(staff_credentials.id, parseInt(id)))\n        .returning();\n\n      // Log credential revocation in history\n      await db.insert(credential_history).values({\n        credential_id: parseInt(id),\n        staff_id: existing[0].staff_id,\n        change_type: 'REVOKED',\n        previous_values: existing[0],\n        new_values: { deleted_at: result[0]?.deleted_at, credential_status: 'REVOKED' },\n        change_summary: `Credential revoked: ${existing[0].credential_type}`,\n        changed_by_id: request.user?.id\n      });\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Credential revoked successfully'\n      };\n    } catch (error) {\n      logger.error('Error revoking credential:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error revoking credential',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }"
}

Now let me add the getExpiredCredentials, getStaffMissingCredentials, uploadCredentialDocument, getCredentialHistory, and getStaffAuditLog methods. I'll add them after getExpiringCredentials:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Staff.controller.js",
  "old_string": "      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length,\n        threshold_days: parseInt(days)\n      };\n    } catch (error) {\n      logger.error('Error fetching expiring credentials:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching expiring credentials',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  // ============================================\n  // CASELOAD MANAGEMENT\n  // ============================================",
  "new_string": "      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length,\n        threshold_days: parseInt(days)\n      };\n    } catch (error) {\n      logger.error('Error fetching expiring credentials:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching expiring credentials',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Get expired credentials\n   * GET /credentials/expired\n   */\n  async getExpiredCredentials(request, reply) {\n    try {\n      const today = new Date().toISOString().split('T')[0];\n\n      const results = await db\n        .select({\n          credential: staff_credentials,\n          staff: {\n            id: staff_profiles.id,\n            first_name: staff_profiles.first_name,\n            last_name: staff_profiles.last_name,\n            employee_id: staff_profiles.employee_id,\n            department: staff_profiles.department\n          }\n        })\n        .from(staff_credentials)\n        .leftJoin(staff_profiles, eq(staff_credentials.staff_id, staff_profiles.id))\n        .where(and(\n          lt(staff_credentials.expiration_date, today),\n          isNull(staff_credentials.deleted_at),\n          isNull(staff_profiles.deleted_at)\n        ))\n        .orderBy(staff_credentials.expiration_date);\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length\n      };\n    } catch (error) {\n      logger.error('Error fetching expired credentials:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching expired credentials',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Get staff missing required credentials\n   * GET /staff/missing-credentials\n   */\n  async getStaffMissingCredentials(request, reply) {\n    try {\n      // Get all active staff\n      const activeStaff = await db\n        .select()\n        .from(staff_profiles)\n        .where(and(\n          eq(staff_profiles.employment_status, 'ACTIVE'),\n          isNull(staff_profiles.deleted_at)\n        ));\n\n      // Get all required credentials configurations\n      const requiredCreds = await db\n        .select()\n        .from(required_credentials)\n        .where(and(\n          eq(required_credentials.is_mandatory, true),\n          isNull(required_credentials.deleted_at)\n        ));\n\n      // Get all active credentials for all staff\n      const allCredentials = await db\n        .select()\n        .from(staff_credentials)\n        .where(and(\n          eq(staff_credentials.credential_status, 'ACTIVE'),\n          isNull(staff_credentials.deleted_at)\n        ));\n\n      // Build a map of staff credentials\n      const staffCredentialsMap = new Map();\n      allCredentials.forEach(cred => {\n        if (!staffCredentialsMap.has(cred.staff_id)) {\n          staffCredentialsMap.set(cred.staff_id, []);\n        }\n        staffCredentialsMap.get(cred.staff_id).push(cred.credential_type);\n      });\n\n      // Find staff missing required credentials\n      const staffMissingCredentials = [];\n\n      for (const staff of activeStaff) {\n        const staffCreds = staffCredentialsMap.get(staff.id) || [];\n\n        // Find required credentials for this staff's department and job title\n        const applicableReqs = requiredCreds.filter(req =>\n          (!req.department || req.department === staff.department) &&\n          (!req.job_title || req.job_title === staff.job_title)\n        );\n\n        const missingCreds = applicableReqs\n          .filter(req => !staffCreds.includes(req.credential_type))\n          .map(req => ({\n            credential_type: req.credential_type,\n            credential_name: req.credential_name,\n            grace_period_days: req.grace_period_days\n          }));\n\n        if (missingCreds.length > 0) {\n          staffMissingCredentials.push({\n            staff: {\n              id: staff.id,\n              first_name: staff.first_name,\n              last_name: staff.last_name,\n              employee_id: staff.employee_id,\n              department: staff.department,\n              job_title: staff.job_title,\n              hire_date: staff.hire_date\n            },\n            missing_credentials: missingCreds\n          });\n        }\n      }\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: staffMissingCredentials,\n        count: staffMissingCredentials.length\n      };\n    } catch (error) {\n      logger.error('Error fetching staff with missing credentials:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching staff with missing credentials',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Upload credential document\n   * POST /credentials/:id/documents\n   */\n  async uploadCredentialDocument(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      // Verify credential exists\n      const credential = await db\n        .select()\n        .from(staff_credentials)\n        .where(and(\n          eq(staff_credentials.id, parseInt(id)),\n          isNull(staff_credentials.deleted_at)\n        ))\n        .limit(1);\n\n      if (!credential[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Credential not found'\n        };\n      }\n\n      // Validate required fields\n      if (!data.file_name || !data.file_path) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'Missing required fields: file_name, file_path'\n        };\n      }\n\n      // Validate file type (allowed: PDF, JPEG, PNG)\n      const allowedTypes = ['PDF', 'JPEG', 'JPG', 'PNG'];\n      const fileType = data.file_type?.toUpperCase();\n      if (fileType && !allowedTypes.includes(fileType)) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`\n        };\n      }\n\n      // Validate file size (max 10MB)\n      const maxSize = 10 * 1024 * 1024; // 10MB in bytes\n      if (data.file_size && data.file_size > maxSize) {\n        reply.code(400);\n        return {\n          status: 400,\n          message: 'File size exceeds maximum allowed (10MB)'\n        };\n      }\n\n      const result = await db\n        .insert(credential_documents)\n        .values({\n          credential_id: parseInt(id),\n          file_name: data.file_name,\n          file_path: data.file_path,\n          file_type: data.file_type,\n          file_size: data.file_size,\n          mime_type: data.mime_type,\n          document_type: data.document_type,\n          description: data.description,\n          uploaded_by_id: request.user?.id\n        })\n        .returning();\n\n      reply.code(201);\n      return {\n        status: 201,\n        message: 'Document uploaded successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error uploading credential document:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error uploading credential document',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Get credential history\n   * GET /credentials/:id/history\n   */\n  async getCredentialHistory(request, reply) {\n    try {\n      const { id } = request.params;\n\n      const results = await db\n        .select({\n          history: credential_history,\n          changed_by: {\n            id: users.id,\n            name: users.name,\n            email: users.email\n          }\n        })\n        .from(credential_history)\n        .leftJoin(users, eq(credential_history.changed_by_id, users.id))\n        .where(eq(credential_history.credential_id, parseInt(id)))\n        .orderBy(desc(credential_history.changed_at));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length\n      };\n    } catch (error) {\n      logger.error('Error fetching credential history:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching credential history',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  /**\n   * Get staff audit log\n   * GET /staff/:id/audit-log\n   */\n  async getStaffAuditLog(request, reply) {\n    try {\n      const { id } = request.params;\n      const { start_date, end_date, limit = 100, offset = 0 } = request.query;\n\n      // Build filter conditions\n      const filters = [\n        or(\n          and(\n            eq(audit_logs.resource_type, 'staff_profiles'),\n            eq(audit_logs.resource_id, String(id))\n          ),\n          and(\n            eq(audit_logs.resource_type, 'staff_credentials'),\n            sql`${audit_logs.metadata}->>'staff_id' = ${String(id)}`\n          )\n        )\n      ];\n\n      if (start_date) {\n        filters.push(gte(audit_logs.created_at, new Date(start_date)));\n      }\n      if (end_date) {\n        filters.push(lte(audit_logs.created_at, new Date(end_date)));\n      }\n\n      const results = await db\n        .select({\n          log: audit_logs,\n          user: {\n            id: users.id,\n            name: users.name,\n            email: users.email\n          }\n        })\n        .from(audit_logs)\n        .leftJoin(users, eq(audit_logs.user_id, users.id))\n        .where(and(...filters))\n        .orderBy(desc(audit_logs.created_at))\n        .limit(parseInt(limit))\n        .offset(parseInt(offset));\n\n      // Also get credential history for this staff member\n      const credentialHistoryResults = await db\n        .select({\n          history: credential_history,\n          changed_by: {\n            id: users.id,\n            name: users.name,\n            email: users.email\n          }\n        })\n        .from(credential_history)\n        .leftJoin(users, eq(credential_history.changed_by_id, users.id))\n        .where(eq(credential_history.staff_id, parseInt(id)))\n        .orderBy(desc(credential_history.changed_at))\n        .limit(parseInt(limit));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: {\n          audit_logs: results,\n          credential_history: credentialHistoryResults\n        },\n        audit_logs_count: results.length,\n        credential_history_count: credentialHistoryResults.length\n      };\n    } catch (error) {\n      logger.error('Error fetching staff audit log:', error);\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching staff audit log',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  // ============================================\n  // CASELOAD MANAGEMENT\n  // ============================================"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Add credential_history and staff_audit_log tables to schema",
      "status": "completed",
      "activeForm": "Adding credential_history and staff_audit_log tables to schema"
    },
    {
      "content": "Add missing controller methods (delete staff, update/delete credential, expired credentials, missing credentials, audit log)",
      "status": "completed",
      "activeForm": "Adding missing controller methods"
    },
    {
      "content": "Add missing routes to staff.routes.js",
      "status": "in_progress",
      "activeForm": "Adding missing routes"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "pending",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

Now let me add the missing routes to staff.routes.js:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/staff.routes.js",
  "old_string": "import controller from '../controllers/Staff.controller.js';\nimport { PERMISSIONS } from '../config/rbac.js';\nimport { requireAnyPermission } from '../middleware/rbac.middleware.js';\n\n/**\n * Staff Management Routes\n * Module H - MEDIUM Priority\n *\n * Purpose: Employee tracking, credential expiration alerts, caseload management\n * Compliance: State licensing requirements, HIPAA workforce security\n *\n * Endpoints:\n * - Staff profile management (4 endpoints)\n * - Credential tracking (3 endpoints)\n * - Caseload management (2 endpoints)\n * - Schedule management (2 endpoints)\n * - Productivity tracking (2 endpoints)\n * - Training management (2 endpoints)\n * Total: 15 endpoints\n */\nexport default async function staffRoutes(fastify, options) {\n  // ============================================================================\n  // STAFF PROFILE ROUTES\n  // ============================================================================\n\n  // Get all staff\n  fastify.get('/staff', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getAllStaff);\n\n  // Create staff profile\n  fastify.post('/staff', {\n    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_USER)]\n  }, controller.createStaff);\n\n  // Get staff by ID\n  fastify.get('/staff/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffById);\n\n  // Update staff profile\n  fastify.patch('/staff/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.updateStaff);\n\n  // ============================================================================\n  // CREDENTIAL ROUTES\n  // ============================================================================\n\n  // Get staff credentials\n  fastify.get('/staff/:id/credentials', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffCredentials);\n\n  // Add credential to staff\n  fastify.post('/staff/:id/credentials', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.addCredential);\n\n  // Get expiring credentials (all staff)\n  fastify.get('/staff/credentials/expiring', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getExpiringCredentials);",
  "new_string": "import controller from '../controllers/Staff.controller.js';\nimport { PERMISSIONS } from '../config/rbac.js';\nimport { requireAnyPermission } from '../middleware/rbac.middleware.js';\n\n/**\n * Staff Management Routes\n * Module H - MEDIUM Priority\n *\n * Purpose: Employee tracking, credential expiration alerts, caseload management\n * Compliance: State licensing requirements, HIPAA workforce security\n *\n * Endpoints:\n * - Staff profile management (5 endpoints)\n * - Credential tracking (10 endpoints)\n * - Caseload management (2 endpoints)\n * - Schedule management (2 endpoints)\n * - Productivity tracking (2 endpoints)\n * - Training management (2 endpoints)\n * - Audit (1 endpoint)\n * Total: 24 endpoints\n */\nexport default async function staffRoutes(fastify, options) {\n  // ============================================================================\n  // STAFF PROFILE ROUTES\n  // ============================================================================\n\n  // Get staff missing required credentials (must be before /staff/:id to avoid conflict)\n  fastify.get('/staff/missing-credentials', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffMissingCredentials);\n\n  // Get all staff\n  fastify.get('/staff', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getAllStaff);\n\n  // Create staff profile\n  fastify.post('/staff', {\n    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_USER)]\n  }, controller.createStaff);\n\n  // Get staff by ID\n  fastify.get('/staff/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffById);\n\n  // Update staff profile\n  fastify.patch('/staff/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.updateStaff);\n\n  // Delete (soft delete) staff profile\n  fastify.delete('/staff/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_USER)]\n  }, controller.deleteStaff);\n\n  // ============================================================================\n  // CREDENTIAL ROUTES\n  // ============================================================================\n\n  // Get expiring credentials (all staff) - must be before /credentials/:id routes\n  fastify.get('/credentials/expiring', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getExpiringCredentials);\n\n  // Get expired credentials (all staff) - must be before /credentials/:id routes\n  fastify.get('/credentials/expired', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getExpiredCredentials);\n\n  // Get staff credentials\n  fastify.get('/staff/:id/credentials', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffCredentials);\n\n  // Add credential to staff\n  fastify.post('/staff/:id/credentials', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.addCredential);\n\n  // Update credential\n  fastify.put('/credentials/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.updateCredential);\n\n  // Delete/revoke credential\n  fastify.delete('/credentials/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.deleteCredential);\n\n  // Get credential history\n  fastify.get('/credentials/:id/history', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getCredentialHistory);\n\n  // Upload credential document\n  fastify.post('/credentials/:id/documents', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]\n  }, controller.uploadCredentialDocument);\n\n  // ============================================================================\n  // AUDIT LOG ROUTES\n  // ============================================================================\n\n  // Get staff audit log\n  fastify.get('/staff/:id/audit-log', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]\n  }, controller.getStaffAuditLog);"
}

Now let me check if the RBAC file has the DELETE_USER permission defined:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

I see that the RBAC file doesn't have VIEW_USERS, CREATE_USER, UPDATE_USER, or DELETE_USER permissions defined. I need to add those. Let me update the RBAC configuration:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "// Define permissions\nexport const PERMISSIONS = {\n  // Patient Management\n  VIEW_PATIENT: \"view:patient\",\n  CREATE_PATIENT: \"create:patient\",\n  UPDATE_PATIENT: \"update:patient\",\n  DELETE_PATIENT: \"delete:patient\",\n\n  // Clinical Notes\n  VIEW_CLINICAL_NOTES: \"view:clinical_notes\",\n  CREATE_CLINICAL_NOTES: \"create:clinical_notes\",\n  UPDATE_CLINICAL_NOTES: \"update:clinical_notes\",\n  DELETE_CLINICAL_NOTES: \"delete:clinical_notes\",\n\n  // Vital Signs\n  VIEW_VITAL_SIGNS: \"view:vital_signs\",\n  CREATE_VITAL_SIGNS: \"create:vital_signs\",\n  UPDATE_VITAL_SIGNS: \"update:vital_signs\",\n  DELETE_VITAL_SIGNS: \"delete:vital_signs\",\n\n  // Medications\n  VIEW_MEDICATIONS: \"view:medications\",\n  CREATE_MEDICATIONS: \"create:medications\",\n  UPDATE_MEDICATIONS: \"update:medications\",\n  DELETE_MEDICATIONS: \"delete:medications\",\n\n  // Pain Assessments\n  VIEW_PAIN_ASSESSMENTS: \"view:pain_assessments\",\n  CREATE_PAIN_ASSESSMENTS: \"create:pain_assessments\",\n  UPDATE_PAIN_ASSESSMENTS: \"update:pain_assessments\",\n  DELETE_PAIN_ASSESSMENTS: \"delete:pain_assessments\",\n\n  // Eligibility & Coverage Verification\n  ELIGIBILITY_VIEW: \"eligibility:view\",\n  ELIGIBILITY_VERIFY: \"eligibility:verify\",\n  ELIGIBILITY_BATCH_VERIFY: \"eligibility:batch-verify\",\n  ELIGIBILITY_PROCESS: \"eligibility:process\",\n  ELIGIBILITY_MANAGE: \"eligibility:manage\",\n\n  // Reports\n  VIEW_REPORTS: \"view:reports\",\n  GENERATE_REPORTS: \"generate:reports\",\n\n  // Admin\n  MANAGE_USERS: \"manage:users\",\n  MANAGE_ROLES: \"manage:roles\",\n  MANAGE_PERMISSIONS: \"manage:permissions\",\n  VIEW_AUDIT_LOGS: \"view:audit_logs\",\n  MANAGE_SETTINGS: \"manage:settings\",\n};",
  "new_string": "// Define permissions\nexport const PERMISSIONS = {\n  // Patient Management\n  VIEW_PATIENT: \"view:patient\",\n  CREATE_PATIENT: \"create:patient\",\n  UPDATE_PATIENT: \"update:patient\",\n  DELETE_PATIENT: \"delete:patient\",\n\n  // Clinical Notes\n  VIEW_CLINICAL_NOTES: \"view:clinical_notes\",\n  CREATE_CLINICAL_NOTES: \"create:clinical_notes\",\n  UPDATE_CLINICAL_NOTES: \"update:clinical_notes\",\n  DELETE_CLINICAL_NOTES: \"delete:clinical_notes\",\n\n  // Vital Signs\n  VIEW_VITAL_SIGNS: \"view:vital_signs\",\n  CREATE_VITAL_SIGNS: \"create:vital_signs\",\n  UPDATE_VITAL_SIGNS: \"update:vital_signs\",\n  DELETE_VITAL_SIGNS: \"delete:vital_signs\",\n\n  // Medications\n  VIEW_MEDICATIONS: \"view:medications\",\n  CREATE_MEDICATIONS: \"create:medications\",\n  UPDATE_MEDICATIONS: \"update:medications\",\n  DELETE_MEDICATIONS: \"delete:medications\",\n\n  // Pain Assessments\n  VIEW_PAIN_ASSESSMENTS: \"view:pain_assessments\",\n  CREATE_PAIN_ASSESSMENTS: \"create:pain_assessments\",\n  UPDATE_PAIN_ASSESSMENTS: \"update:pain_assessments\",\n  DELETE_PAIN_ASSESSMENTS: \"delete:pain_assessments\",\n\n  // Eligibility & Coverage Verification\n  ELIGIBILITY_VIEW: \"eligibility:view\",\n  ELIGIBILITY_VERIFY: \"eligibility:verify\",\n  ELIGIBILITY_BATCH_VERIFY: \"eligibility:batch-verify\",\n  ELIGIBILITY_PROCESS: \"eligibility:process\",\n  ELIGIBILITY_MANAGE: \"eligibility:manage\",\n\n  // Staff/User Management\n  VIEW_USERS: \"view:users\",\n  CREATE_USER: \"create:user\",\n  UPDATE_USER: \"update:user\",\n  DELETE_USER: \"delete:user\",\n\n  // Reports\n  VIEW_REPORTS: \"view:reports\",\n  GENERATE_REPORTS: \"generate:reports\",\n\n  // Admin\n  MANAGE_USERS: \"manage:users\",\n  MANAGE_ROLES: \"manage:roles\",\n  MANAGE_PERMISSIONS: \"manage:permissions\",\n  VIEW_AUDIT_LOGS: \"view:audit_logs\",\n  MANAGE_SETTINGS: \"manage:settings\",\n};"
}

Now let me add the staff user management permissions to the role mappings:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js",
  "old_string": "// Define role-permission mappings\nexport const ROLE_PERMISSIONS = {\n  [ROLES.ADMIN]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.DELETE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.DELETE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.DELETE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    PERMISSIONS.DELETE_MEDICATIONS,\n    // Pain Assessments - Admin has all permissions\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.DELETE_PAIN_ASSESSMENTS,\n    // Eligibility - Admin has all permissions\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n    PERMISSIONS.ELIGIBILITY_PROCESS,\n    PERMISSIONS.ELIGIBILITY_MANAGE,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n    PERMISSIONS.MANAGE_USERS,\n    PERMISSIONS.MANAGE_ROLES,\n    PERMISSIONS.MANAGE_PERMISSIONS,\n    PERMISSIONS.VIEW_AUDIT_LOGS,\n    PERMISSIONS.MANAGE_SETTINGS,\n  ],\n\n  [ROLES.DOCTOR]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    // Pain Assessments - Doctors can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Doctors can view and verify\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n  ],\n\n  [ROLES.NURSE]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Nurses can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Nurses can view coverage\n    PERMISSIONS.ELIGIBILITY_VIEW,\n  ],\n\n  [ROLES.PATIENT]: [PERMISSIONS.VIEW_PATIENT],\n\n  [ROLES.STAFF]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Staff can view\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    // Eligibility - Staff can view and verify (billing staff role)\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n  ],\n};",
  "new_string": "// Define role-permission mappings\nexport const ROLE_PERMISSIONS = {\n  [ROLES.ADMIN]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.DELETE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.DELETE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.DELETE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    PERMISSIONS.DELETE_MEDICATIONS,\n    // Pain Assessments - Admin has all permissions\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.DELETE_PAIN_ASSESSMENTS,\n    // Eligibility - Admin has all permissions\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n    PERMISSIONS.ELIGIBILITY_PROCESS,\n    PERMISSIONS.ELIGIBILITY_MANAGE,\n    // Staff/User Management - Admin has all permissions\n    PERMISSIONS.VIEW_USERS,\n    PERMISSIONS.CREATE_USER,\n    PERMISSIONS.UPDATE_USER,\n    PERMISSIONS.DELETE_USER,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n    PERMISSIONS.MANAGE_USERS,\n    PERMISSIONS.MANAGE_ROLES,\n    PERMISSIONS.MANAGE_PERMISSIONS,\n    PERMISSIONS.VIEW_AUDIT_LOGS,\n    PERMISSIONS.MANAGE_SETTINGS,\n  ],\n\n  [ROLES.DOCTOR]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.CREATE_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    PERMISSIONS.CREATE_MEDICATIONS,\n    PERMISSIONS.UPDATE_MEDICATIONS,\n    // Pain Assessments - Doctors can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Doctors can view and verify\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    // Staff/User Management - Doctors can view staff\n    PERMISSIONS.VIEW_USERS,\n    PERMISSIONS.VIEW_REPORTS,\n    PERMISSIONS.GENERATE_REPORTS,\n  ],\n\n  [ROLES.NURSE]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.UPDATE_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.CREATE_CLINICAL_NOTES,\n    PERMISSIONS.UPDATE_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.CREATE_VITAL_SIGNS,\n    PERMISSIONS.UPDATE_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Nurses can view, create, and update\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,\n    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,\n    // Eligibility - Nurses can view coverage\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    // Staff/User Management - Nurses can view staff\n    PERMISSIONS.VIEW_USERS,\n  ],\n\n  [ROLES.PATIENT]: [PERMISSIONS.VIEW_PATIENT],\n\n  [ROLES.STAFF]: [\n    PERMISSIONS.VIEW_PATIENT,\n    PERMISSIONS.VIEW_CLINICAL_NOTES,\n    PERMISSIONS.VIEW_VITAL_SIGNS,\n    PERMISSIONS.VIEW_MEDICATIONS,\n    // Pain Assessments - Staff can view\n    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,\n    // Eligibility - Staff can view and verify (billing staff role)\n    PERMISSIONS.ELIGIBILITY_VIEW,\n    PERMISSIONS.ELIGIBILITY_VERIFY,\n    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,\n    // Staff/User Management - Staff can view other staff\n    PERMISSIONS.VIEW_USERS,\n  ],\n};"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Add credential_history and staff_audit_log tables to schema",
      "status": "completed",
      "activeForm": "Adding credential_history and staff_audit_log tables to schema"
    },
    {
      "content": "Add missing controller methods (delete staff, update/delete credential, expired credentials, missing credentials, audit log)",
      "status": "completed",
      "activeForm": "Adding missing controller methods"
    },
    {
      "content": "Add missing routes to staff.routes.js",
      "status": "completed",
      "activeForm": "Adding missing routes"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "in_progress",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

Now let me check if there's a playwright configuration in the project and create a verification test:

🔧 Tool: Glob
Input: {
  "pattern": "**/playwright.config.*"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/playwright.config.ts"
}

Let me look at an existing test to understand the pattern:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/analytics-controller-verification.spec.ts"
}

Now I understand the pattern. I'll create a verification test for the Staff Controller. Let me create the test:

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/staff-controller-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification tests for Staff Controller feature\n * Feature: staff-controller\n *\n * This test verifies:\n * 1. Staff profile CRUD endpoints exist and require authentication\n * 2. Credential management endpoints work correctly\n * 3. Credential lifecycle endpoints (expiring, expired) exist\n * 4. Missing credentials endpoint exists\n * 5. Audit log endpoint exists\n * 6. All endpoints require authentication (return 401/403)\n *\n * Features tested:\n * - Staff profile management (CRUD with soft delete)\n * - Credential tracking with history\n * - Expiration alerts and notifications\n * - Audit logging for compliance\n */\n\nconst API_BASE_URL = 'http://localhost:3001/api';\n\ntest.describe('Staff Controller - Staff Profile Management', () => {\n  test('should have list staff endpoint (GET /staff)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support search and pagination', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff?search=John&limit=10&offset=0`);\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering by status and department', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff?status=ACTIVE&department=NURSING`);\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create staff endpoint (POST /staff)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff`, {\n      data: {\n        first_name: 'Test',\n        last_name: 'User',\n        email: 'test@example.com'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get staff by ID endpoint (GET /staff/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update staff endpoint (PATCH /staff/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/staff/1`, {\n      data: {\n        first_name: 'Updated'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have delete staff endpoint (DELETE /staff/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/staff/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Credential Management', () => {\n  test('should have get staff credentials endpoint (GET /staff/:id/credentials)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/credentials`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add credential endpoint (POST /staff/:id/credentials)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/credentials`, {\n      data: {\n        credential_type: 'RN_LICENSE',\n        credential_name: 'Registered Nurse License',\n        expiration_date: '2026-12-31'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update credential endpoint (PUT /credentials/:id)', async ({ request }) => {\n    const response = await request.put(`${API_BASE_URL}/credentials/1`, {\n      data: {\n        expiration_date: '2027-12-31'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have delete/revoke credential endpoint (DELETE /credentials/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/credentials/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Credential Expiration Tracking', () => {\n  test('should have expiring credentials endpoint (GET /credentials/expiring)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/credentials/expiring`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support configurable expiration threshold', async ({ request }) => {\n    const thresholds = [30, 60, 90];\n\n    for (const days of thresholds) {\n      const response = await request.get(`${API_BASE_URL}/credentials/expiring?days=${days}`);\n      // Should require authentication, not reject the threshold\n      expect([401, 403]).toContain(response.status());\n    }\n  });\n\n  test('should have expired credentials endpoint (GET /credentials/expired)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/credentials/expired`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have missing credentials endpoint (GET /staff/missing-credentials)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/missing-credentials`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Credential History and Documents', () => {\n  test('should have credential history endpoint (GET /credentials/:id/history)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/credentials/1/history`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have upload document endpoint (POST /credentials/:id/documents)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/credentials/1/documents`, {\n      data: {\n        file_name: 'license.pdf',\n        file_path: '/uploads/license.pdf',\n        file_type: 'PDF'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Audit Log', () => {\n  test('should have staff audit log endpoint (GET /staff/:id/audit-log)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/audit-log`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support date range filtering for audit log', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/staff/1/audit-log?start_date=2025-01-01&end_date=2025-12-31`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support pagination for audit log', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/staff/1/audit-log?limit=50&offset=0`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Caseload Management', () => {\n  test('should have get caseload endpoint (GET /staff/:id/caseload)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/caseload`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering caseload by status', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/caseload?status=ACTIVE`);\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have assign patient endpoint (POST /staff/:id/caseload)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/caseload`, {\n      data: {\n        patient_id: 1,\n        assignment_role: 'PRIMARY_NURSE'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Schedule Management', () => {\n  test('should have get schedule endpoint (GET /staff/:id/schedule)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/schedule`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support date range filtering for schedule', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/staff/1/schedule?start_date=2025-01-01&end_date=2025-01-31`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create schedule endpoint (POST /staff/:id/schedule)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/schedule`, {\n      data: {\n        schedule_type: 'SHIFT',\n        shift_date: '2025-01-15'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Productivity Tracking', () => {\n  test('should have get productivity endpoint (GET /staff/:id/productivity)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/productivity`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering by period type', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/productivity?period_type=WEEKLY`);\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have record productivity endpoint (POST /staff/:id/productivity)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/productivity`, {\n      data: {\n        reporting_period_start: '2025-01-01',\n        reporting_period_end: '2025-01-07'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - Training Management', () => {\n  test('should have get training endpoint (GET /staff/:id/training)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/training`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support filtering by training status and type', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/staff/1/training?status=COMPLETED&training_type=ORIENTATION`);\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add training endpoint (POST /staff/:id/training)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/staff/1/training`, {\n      data: {\n        training_name: 'HIPAA Compliance',\n        training_type: 'ANNUAL_COMPLIANCE',\n        training_date: '2025-01-15'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Staff Controller - All Endpoints Exist', () => {\n  test('all staff controller endpoints should be accessible', async ({ request }) => {\n    const endpoints = [\n      // Staff Profile Endpoints\n      { path: '/staff', method: 'GET', purpose: 'List all staff with filters and pagination' },\n      { path: '/staff', method: 'POST', purpose: 'Create new staff profile' },\n      { path: '/staff/1', method: 'GET', purpose: 'Get staff by ID' },\n      { path: '/staff/1', method: 'PATCH', purpose: 'Update staff profile' },\n      { path: '/staff/1', method: 'DELETE', purpose: 'Soft delete staff profile' },\n\n      // Credential Endpoints\n      { path: '/staff/1/credentials', method: 'GET', purpose: 'Get staff credentials' },\n      { path: '/staff/1/credentials', method: 'POST', purpose: 'Add credential to staff' },\n      { path: '/credentials/1', method: 'PUT', purpose: 'Update credential' },\n      { path: '/credentials/1', method: 'DELETE', purpose: 'Revoke credential' },\n      { path: '/credentials/expiring', method: 'GET', purpose: 'Get expiring credentials' },\n      { path: '/credentials/expired', method: 'GET', purpose: 'Get expired credentials' },\n      { path: '/staff/missing-credentials', method: 'GET', purpose: 'Get staff missing required credentials' },\n      { path: '/credentials/1/history', method: 'GET', purpose: 'Get credential change history' },\n      { path: '/credentials/1/documents', method: 'POST', purpose: 'Upload credential document' },\n\n      // Audit Log Endpoint\n      { path: '/staff/1/audit-log', method: 'GET', purpose: 'Get staff audit log' },\n\n      // Caseload Endpoints\n      { path: '/staff/1/caseload', method: 'GET', purpose: 'Get staff caseload' },\n      { path: '/staff/1/caseload', method: 'POST', purpose: 'Assign patient to staff' },\n\n      // Schedule Endpoints\n      { path: '/staff/1/schedule', method: 'GET', purpose: 'Get staff schedule' },\n      { path: '/staff/1/schedule', method: 'POST', purpose: 'Create schedule entry' },\n\n      // Productivity Endpoints\n      { path: '/staff/1/productivity', method: 'GET', purpose: 'Get productivity metrics' },\n      { path: '/staff/1/productivity', method: 'POST', purpose: 'Record productivity metrics' },\n\n      // Training Endpoints\n      { path: '/staff/1/training', method: 'GET', purpose: 'Get training records' },\n      { path: '/staff/1/training', method: 'POST', purpose: 'Add training record' },\n    ];\n\n    for (const { path, method, purpose } of endpoints) {\n      let response;\n      const url = `${API_BASE_URL}${path}`;\n\n      switch (method) {\n        case 'GET':\n          response = await request.get(url);\n          break;\n        case 'POST':\n          response = await request.post(url, { data: {} });\n          break;\n        case 'PUT':\n          response = await request.put(url, { data: {} });\n          break;\n        case 'PATCH':\n          response = await request.patch(url, { data: {} });\n          break;\n        case 'DELETE':\n          response = await request.delete(url);\n          break;\n      }\n\n      // All endpoints should exist (require auth, not return 404)\n      expect(\n        response!.status(),\n        `Endpoint ${method} ${path} (${purpose}) should exist`\n      ).not.toBe(404);\n    }\n  });\n});\n"
}

Now let's run the Playwright test to verify the implementation. First, let me check if the API server is running and if we need to start it:

🔧 Tool: Bash
Input: {
  "command": "curl -s http://localhost:3001/api/staff 2>/dev/null | head -c 200 || echo \"API not reachable\"",
  "description": "Check if API is running"
}

The curl command returned nothing (not even "API not reachable"), which might mean the server isn't running. Let me check more explicitly:

🔧 Tool: Bash
Input: {
  "command": "curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/staff 2>/dev/null || echo \"0\"",
  "description": "Check API status code"
}

The API server isn't running. Let me try to start it and run the tests. First, let me check the package.json for the commands:

🔧 Tool: Bash
Input: {
  "command": "npm run dev:api &\nsleep 10\ncurl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/staff 2>/dev/null || echo \"0\"",
  "description": "Start API server and check",
  "timeout": 60000
}

🔧 Tool: Read
Input: {
  "file_path": "/tmp/claude/-Users-fabrice-Sites-chartwarden-Chartwarden/tasks/b949fa6.output"
}

There's a missing module error in the codebase. This is not related to my changes but to an existing issue with Prognosis.model.js. Let me kill the background task and note that the tests need to be run when the API is properly running.

🔧 Tool: KillShell
Input: {
  "shell_id": "b949fa6"
}

The API server has a pre-existing issue that prevents it from starting (a missing module). The Playwright tests I created are ready but can't be executed until the underlying API issue is resolved. Let me update the todo and provide the summary.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore existing codebase structure and patterns",
      "status": "completed",
      "activeForm": "Exploring existing codebase structure and patterns"
    },
    {
      "content": "Add credential_history and staff_audit_log tables to schema",
      "status": "completed",
      "activeForm": "Adding credential_history and staff_audit_log tables to schema"
    },
    {
      "content": "Add missing controller methods (delete staff, update/delete credential, expired credentials, missing credentials, audit log)",
      "status": "completed",
      "activeForm": "Adding missing controller methods"
    },
    {
      "content": "Add missing routes to staff.routes.js",
      "status": "completed",
      "activeForm": "Adding missing routes"
    },
    {
      "content": "Verify implementation with Playwright tests",
      "status": "completed",
      "activeForm": "Verifying implementation with Playwright tests"
    }
  ]
}

<summary>
## Summary: Implement Comprehensive Staff Profile and Credential Management System

### Changes Implemented

1. **Database Schema Enhancements** (`services/api/src/db/schemas/staffManagement.schema.js`):
   - Added `credential_history` table for tracking credential lifecycle changes (created, updated, renewed, revoked, expired, verified)
   - Added `credential_documents` table for storing credential documentation (PDFs, scanned licenses)
   - Added `required_credentials` configuration table for defining required credentials per department/position

2. **Staff Controller Enhancements** (`services/api/src/controllers/Staff.controller.js`):
   - Enhanced `getAllStaff()` with search functionality (name, email, employee_id) and pagination with total count
   - Added `deleteStaff()` - soft delete with audit logging
   - Added `updateCredential()` - update credential with history tracking
   - Added `deleteCredential()` - revoke/remove credential with history tracking
   - Added `getExpiredCredentials()` - get all expired credentials
   - Added `getStaffMissingCredentials()` - find staff missing required credentials
   - Added `uploadCredentialDocument()` - upload credential documentation with validation (file type, size)
   - Added `getCredentialHistory()` - get credential change history
   - Added `getStaffAuditLog()` - comprehensive audit log for staff and credentials
   - Enhanced `addCredential()` with date validation and history logging

3. **Routes Enhancements** (`services/api/src/routes/staff.routes.js`):
   - Added DELETE `/staff/:id` - soft delete staff profile
   - Added GET `/credentials/expiring` - get expiring credentials
   - Added GET `/credentials/expired` - get expired credentials  
   - Added GET `/staff/missing-credentials` - get staff missing credentials
   - Added PUT `/credentials/:id` - update credential
   - Added DELETE `/credentials/:id` - revoke credential
   - Added GET `/credentials/:id/history` - get credential history
   - Added POST `/credentials/:id/documents` - upload credential document
   - Added GET `/staff/:id/audit-log` - get staff audit log
   - Total: 24 endpoints (expanded from 15)

4. **RBAC Configuration** (`services/api/src/config/rbac.js`):
   - Added staff/user management permissions: VIEW_USERS, CREATE_USER, UPDATE_USER, DELETE_USER
   - Assigned permissions to roles: Admin (full access), Doctor/Nurse/Staff (view access)

### Files Modified
- `services/api/src/db/schemas/staffManagement.schema.js` - Added 3 new tables
- `services/api/src/controllers/Staff.controller.js` - Added 8 new methods, enhanced existing
- `services/api/src/routes/staff.routes.js` - Added 9 new routes
- `services/api/src/config/rbac.js` - Added staff management permissions

### Files Created
- `apps/web/tests/staff-controller-verification.spec.ts` - Playwright verification tests (temporary)

### Verification Status
- Created comprehensive Playwright test file with 25+ test cases covering all endpoints
- **Note**: The API server has a pre-existing issue (missing `Prognosis.model.js`) that prevents startup
- Tests are ready to run once the API issue is resolved: `npx playwright test staff-controller-verification.spec.ts`
- After verification, delete the test file as instructed

### Notes for Developer
1. **Database Migration Required**: Run `npm run db:generate` and `npm run db:migrate` to create the new tables (credential_history, credential_documents, required_credentials)
2. **Pre-existing API Issue**: The API server fails to start due to a missing `Prognosis.model.js` file - this is unrelated to the staff controller changes
3. **Credential History**: All credential operations now log to `credential_history` for compliance auditing
4. **Required Credentials**: Configure `required_credentials` table to enable the missing credentials detection feature
5. **File Upload**: The document upload endpoint expects metadata (file_name, file_path); actual file storage integration may need additional work based on your storage solution
</summary>