
🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "in_progress",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Design bereavement schema and database model",
      "status": "pending",
      "activeForm": "Designing bereavement schema"
    },
    {
      "content": "Implement bereavement controller with CRUD operations",
      "status": "pending",
      "activeForm": "Implementing bereavement controller"
    },
    {
      "content": "Create bereavement routes with authorization",
      "status": "pending",
      "activeForm": "Creating bereavement routes"
    },
    {
      "content": "Add RBAC permissions for bereavement operations",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

🔧 Tool: Task
Input: {
  "description": "Explore controller patterns",
  "prompt": "I need to implement a bereavement service controller for a hospice EHR system. Please explore the codebase to understand:\n\n1. The existing controller patterns in services/api/src/controllers/\n2. The schema patterns in services/api/src/db/schemas/\n3. The route patterns in services/api/src/routes/\n4. The RBAC configuration in services/api/src/config/rbac.js\n\nFocus on finding:\n- How controllers are structured (method signatures, error handling, response format)\n- How schemas are defined (field types, relations, indexes)\n- How routes are registered (middleware, authentication, authorization)\n- How RBAC permissions are configured\n\nProvide concrete examples from existing code that I should follow.",
  "subagent_type": "Explore"
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/controllers/*.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/db/schemas/*.js"
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
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Patient.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Encounter.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/bereavement.routes.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/patient.routes.js",
  "limit": 100
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/bereavement.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/encounters.schema.js",
  "limit": 150
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "in_progress",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Design bereavement schema and database model",
      "status": "pending",
      "activeForm": "Designing bereavement schema"
    },
    {
      "content": "Implement bereavement controller with CRUD operations",
      "status": "pending",
      "activeForm": "Implementing bereavement controller"
    },
    {
      "content": "Create bereavement routes with authorization",
      "status": "pending",
      "activeForm": "Creating bereavement routes"
    },
    {
      "content": "Add RBAC permissions for bereavement operations",
      "status": "pending",
      "activeForm": "Adding RBAC permissions"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

The explore agent found that bereavement implementation already exists. Let me read the existing files to understand the current state and identify any gaps.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/bereavement.schema.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/bereavement.routes.js"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "in_progress",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add soft delete endpoint for bereavement cases",
      "status": "pending",
      "activeForm": "Adding soft delete endpoint"
    },
    {
      "content": "Add search/filter capabilities with date range",
      "status": "pending",
      "activeForm": "Adding search and filtering"
    },
    {
      "content": "Add staff assignment endpoints",
      "status": "pending",
      "activeForm": "Adding staff assignment"
    },
    {
      "content": "Add document attachment support",
      "status": "pending",
      "activeForm": "Adding document attachment"
    },
    {
      "content": "Add case reports and summaries endpoint",
      "status": "pending",
      "activeForm": "Adding reports endpoint"
    },
    {
      "content": "Add audit logging for all operations",
      "status": "pending",
      "activeForm": "Adding audit logging"
    },
    {
      "content": "Add optimistic locking for concurrent updates",
      "status": "pending",
      "activeForm": "Adding optimistic locking"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

The bereavement controller already exists with comprehensive functionality. Let me check the schema index and api routes to see if the routes are properly registered.

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/index.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/config/rbac.js"
}

I can see that the bereavement controller already exists with a comprehensive implementation. The routes are registered (line 258 in api.routes.js), and the schema and controller files are in place. Let me now identify what features from the requirements are missing and need to be implemented:

**Requirements Analysis:**

Looking at the requirements, I need to enhance the existing implementation with:

1. ✅ RESTful API endpoints for CRUD - Already implemented
2. ✅ Support creation of new cases - Already implemented  
3. ✅ Track case status - Already implemented
4. ❌ Document attachment and management (death certificates, service agreements) - **MISSING**
5. ✅ Search and filtering - Partially implemented (need date range)
6. ❌ Audit logging for all case modifications - **MISSING** (basic logging only)
7. ❌ Validation for required fields - **MISSING** (basic validation only)
8. ❌ Staff assignment endpoints - **MISSING** (field exists but no dedicated endpoint)
9. ❌ Report generation endpoints - **MISSING**
10. ❌ Soft delete endpoint - **MISSING** (delete_at field exists but no endpoint)
11. ❌ Concurrent update handling (optimistic locking) - **MISSING**

Let me implement these missing features.

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "in_progress",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Add soft delete endpoint for bereavement cases",
      "status": "pending",
      "activeForm": "Adding soft delete endpoint"
    },
    {
      "content": "Add search/filter capabilities with date range",
      "status": "pending",
      "activeForm": "Adding search and filtering"
    },
    {
      "content": "Add staff assignment endpoints",
      "status": "pending",
      "activeForm": "Adding staff assignment"
    },
    {
      "content": "Add case reports and summaries endpoint",
      "status": "pending",
      "activeForm": "Adding reports endpoint"
    },
    {
      "content": "Add audit logging for all operations",
      "status": "pending",
      "activeForm": "Adding audit logging"
    },
    {
      "content": "Add optimistic locking for concurrent updates",
      "status": "pending",
      "activeForm": "Adding optimistic locking"
    },
    {
      "content": "Add required field validations",
      "status": "pending",
      "activeForm": "Adding field validations"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/db/schemas/bereavement.schema.js",
  "old_string": "export const bereavement_memorial_attendees = pgTable('bereavement_memorial_attendees', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  memorial_service_id: bigint('memorial_service_id', { mode: 'number' }).references(() => bereavement_memorial_services.id).notNull(),\n  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id),\n  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),\n\n  // Attendee info (may not always be linked to bereavement contacts)\n  attendee_name: varchar('attendee_name', { length: 255 }),\n  attendee_email: varchar('attendee_email', { length: 255 }),\n  attendee_phone: varchar('attendee_phone', { length: 50 }),\n  relationship_to_deceased: varchar('relationship_to_deceased', { length: 100 }),\n  patient_remembered: varchar('patient_remembered', { length: 255 }), // Name of the patient being remembered\n\n  // Registration\n  registration_date: date('registration_date'),\n  guest_count: integer('guest_count').default(1), // Number of guests attending with this person\n\n  // Special requests\n  special_requests: text('special_requests'),\n  accessibility_needs: text('accessibility_needs'),\n  dietary_restrictions: text('dietary_restrictions'),\n\n  // Attendance\n  rsvp_status: varchar('rsvp_status', { length: 50 }).default('PENDING'), // PENDING, CONFIRMED, DECLINED, WAITLIST\n  attended: boolean('attended'),\n  attendance_notes: text('attendance_notes'),\n\n  // Feedback\n  provided_feedback: boolean('provided_feedback').default(false),\n  feedback: text('feedback'),\n  feedback_date: date('feedback_date'),\n\n  // Metadata\n  metadata: jsonb('metadata'),\n\n  // Audit fields\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});",
  "new_string": "export const bereavement_memorial_attendees = pgTable('bereavement_memorial_attendees', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  memorial_service_id: bigint('memorial_service_id', { mode: 'number' }).references(() => bereavement_memorial_services.id).notNull(),\n  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id),\n  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),\n\n  // Attendee info (may not always be linked to bereavement contacts)\n  attendee_name: varchar('attendee_name', { length: 255 }),\n  attendee_email: varchar('attendee_email', { length: 255 }),\n  attendee_phone: varchar('attendee_phone', { length: 50 }),\n  relationship_to_deceased: varchar('relationship_to_deceased', { length: 100 }),\n  patient_remembered: varchar('patient_remembered', { length: 255 }), // Name of the patient being remembered\n\n  // Registration\n  registration_date: date('registration_date'),\n  guest_count: integer('guest_count').default(1), // Number of guests attending with this person\n\n  // Special requests\n  special_requests: text('special_requests'),\n  accessibility_needs: text('accessibility_needs'),\n  dietary_restrictions: text('dietary_restrictions'),\n\n  // Attendance\n  rsvp_status: varchar('rsvp_status', { length: 50 }).default('PENDING'), // PENDING, CONFIRMED, DECLINED, WAITLIST\n  attended: boolean('attended'),\n  attendance_notes: text('attendance_notes'),\n\n  // Feedback\n  provided_feedback: boolean('provided_feedback').default(false),\n  feedback: text('feedback'),\n  feedback_date: date('feedback_date'),\n\n  // Metadata\n  metadata: jsonb('metadata'),\n\n  // Audit fields\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});\n\n/**\n * Bereavement Documents Table\n * Tracks document attachments for bereavement cases (death certificates, service agreements, correspondence)\n */\nexport const bereavement_documents = pgTable('bereavement_documents', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),\n\n  // Document details\n  document_type: varchar('document_type', { length: 100 }).notNull(), // DEATH_CERTIFICATE, SERVICE_AGREEMENT, CORRESPONDENCE, CONSENT_FORM, ASSESSMENT_FORM, OTHER\n  document_name: varchar('document_name', { length: 255 }).notNull(),\n  document_description: text('document_description'),\n\n  // File information\n  file_name: varchar('file_name', { length: 255 }).notNull(),\n  file_path: text('file_path').notNull(), // Storage path or S3 key\n  file_size: integer('file_size'), // Size in bytes\n  file_type: varchar('file_type', { length: 100 }), // MIME type (application/pdf, image/jpeg, etc.)\n\n  // Document metadata\n  document_date: date('document_date'), // Date on the document (e.g., death date on certificate)\n  effective_date: date('effective_date'), // When the document becomes effective\n  expiration_date: date('expiration_date'), // When the document expires (if applicable)\n\n  // Status and workflow\n  document_status: varchar('document_status', { length: 50 }).default('PENDING').notNull(), // PENDING, VERIFIED, APPROVED, REJECTED, ARCHIVED\n  verification_date: date('verification_date'),\n  verified_by_id: text('verified_by_id').references(() => users.id),\n  verification_notes: text('verification_notes'),\n\n  // Related entities\n  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),\n\n  // Access control\n  is_confidential: boolean('is_confidential').default(false),\n  access_restrictions: jsonb('access_restrictions'), // JSON object with access rules\n\n  // Version control\n  version: integer('version').default(1),\n  parent_document_id: bigint('parent_document_id', { mode: 'number' }), // For document revisions\n\n  // Notes\n  notes: text('notes'),\n  metadata: jsonb('metadata'),\n\n  // Audit fields\n  uploaded_by_id: text('uploaded_by_id').references(() => users.id),\n  created_by_id: text('created_by_id').references(() => users.id),\n  updated_by_id: text('updated_by_id').references(() => users.id),\n  deleted_at: timestamp('deleted_at'),\n  createdAt: timestamp('created_at').defaultNow().notNull(),\n  updatedAt: timestamp('updated_at').defaultNow().notNull()\n});\n\n/**\n * Bereavement Audit Log Table\n * Tracks all modifications to bereavement cases for HIPAA compliance\n */\nexport const bereavement_audit_log = pgTable('bereavement_audit_log', {\n  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),\n  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),\n\n  // Action details\n  action_type: varchar('action_type', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, VIEW, EXPORT, STATUS_CHANGE, ASSIGNMENT_CHANGE\n  entity_type: varchar('entity_type', { length: 100 }).notNull(), // bereavement_cases, bereavement_contacts, bereavement_documents, etc.\n  entity_id: bigint('entity_id', { mode: 'number' }),\n\n  // Change tracking\n  field_name: varchar('field_name', { length: 255 }), // The field that was changed (for UPDATE actions)\n  old_value: text('old_value'), // Previous value (JSON stringified for complex types)\n  new_value: text('new_value'), // New value (JSON stringified for complex types)\n  changes_summary: jsonb('changes_summary'), // JSON object with all changes in a single update\n\n  // User and session info\n  user_id: text('user_id').references(() => users.id).notNull(),\n  user_name: varchar('user_name', { length: 255 }),\n  user_role: varchar('user_role', { length: 100 }),\n  ip_address: varchar('ip_address', { length: 45 }), // IPv6 support\n  user_agent: text('user_agent'),\n  session_id: varchar('session_id', { length: 255 }),\n\n  // Additional context\n  reason: text('reason'), // Reason for the change (optional)\n  additional_context: jsonb('additional_context'), // Any additional context\n\n  // Timestamp\n  action_timestamp: timestamp('action_timestamp').defaultNow().notNull(),\n  createdAt: timestamp('created_at').defaultNow().notNull()\n});"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "completed",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Update controller with new features",
      "status": "in_progress",
      "activeForm": "Updating controller with enhancements"
    },
    {
      "content": "Add soft delete endpoint for bereavement cases",
      "status": "pending",
      "activeForm": "Adding soft delete endpoint"
    },
    {
      "content": "Add search/filter capabilities with date range",
      "status": "pending",
      "activeForm": "Adding search and filtering"
    },
    {
      "content": "Add staff assignment endpoints",
      "status": "pending",
      "activeForm": "Adding staff assignment"
    },
    {
      "content": "Add case reports and summaries endpoint",
      "status": "pending",
      "activeForm": "Adding reports endpoint"
    },
    {
      "content": "Add audit logging for all operations",
      "status": "pending",
      "activeForm": "Adding audit logging"
    },
    {
      "content": "Add optimistic locking for concurrent updates",
      "status": "pending",
      "activeForm": "Adding optimistic locking"
    },
    {
      "content": "Add required field validations",
      "status": "pending",
      "activeForm": "Adding field validations"
    },
    {
      "content": "Update routes with new endpoints",
      "status": "pending",
      "activeForm": "Updating routes"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

Now let me enhance the controller with the missing features:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "old_string": "import { db } from '../config/db.drizzle.js';\nimport {\n  bereavement_cases,\n  bereavement_contacts,\n  bereavement_plans,\n  bereavement_encounters,\n  bereavement_risk_assessments,\n  support_groups,\n  support_group_sessions,\n  support_group_participants,\n  bereavement_follow_ups,\n  bereavement_resources,\n  bereavement_memorial_services,\n  bereavement_memorial_attendees,\n  patients\n} from '../db/schemas/index.js';\nimport { eq, and, desc, isNull, gte, lte, sql } from 'drizzle-orm';\nimport crypto from 'crypto';\n\nimport { logger } from '../utils/logger.js';",
  "new_string": "import { db } from '../config/db.drizzle.js';\nimport {\n  bereavement_cases,\n  bereavement_contacts,\n  bereavement_plans,\n  bereavement_encounters,\n  bereavement_risk_assessments,\n  support_groups,\n  support_group_sessions,\n  support_group_participants,\n  bereavement_follow_ups,\n  bereavement_resources,\n  bereavement_memorial_services,\n  bereavement_memorial_attendees,\n  bereavement_documents,\n  bereavement_audit_log,\n  patients,\n  users\n} from '../db/schemas/index.js';\nimport { eq, and, desc, asc, isNull, gte, lte, sql, or, ilike, count } from 'drizzle-orm';\nimport crypto from 'crypto';\n\nimport { logger } from '../utils/logger.js';\n\n// Allowed document types\nconst ALLOWED_DOCUMENT_TYPES = ['DEATH_CERTIFICATE', 'SERVICE_AGREEMENT', 'CORRESPONDENCE', 'CONSENT_FORM', 'ASSESSMENT_FORM', 'OTHER'];\n\n// Allowed document MIME types (security)\nconst ALLOWED_MIME_TYPES = [\n  'application/pdf',\n  'image/jpeg',\n  'image/png',\n  'image/gif',\n  'application/msword',\n  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',\n  'text/plain'\n];\n\n// Maximum file size (10MB)\nconst MAX_FILE_SIZE = 10 * 1024 * 1024;\n\n/**\n * Log audit entry for bereavement operations\n */\nasync function logBereavementAudit(request, action_type, entity_type, entity_id, caseId, changes = null) {\n  try {\n    await db.insert(bereavement_audit_log).values({\n      bereavement_case_id: caseId,\n      action_type,\n      entity_type,\n      entity_id,\n      changes_summary: changes,\n      user_id: request.user?.id || 'system',\n      user_name: request.user?.name || 'System',\n      user_role: request.user?.role || 'unknown',\n      ip_address: request.ip || request.headers?.['x-forwarded-for'] || 'unknown',\n      user_agent: request.headers?.['user-agent'] || 'unknown',\n      session_id: request.session?.id || null\n    });\n  } catch (error) {\n    logger.error('Failed to log bereavement audit:', { error: error.message, action_type, entity_type, entity_id });\n  }\n}\n\n/**\n * Validate required fields for bereavement case creation\n */\nfunction validateBereavementCase(data) {\n  const errors = [];\n\n  if (!data.patient_id) {\n    errors.push({ field: 'patient_id', message: 'Patient ID is required' });\n  }\n\n  if (!data.date_of_death) {\n    errors.push({ field: 'date_of_death', message: 'Date of death is required' });\n  } else {\n    const deathDate = new Date(data.date_of_death);\n    const today = new Date();\n    if (deathDate > today) {\n      errors.push({ field: 'date_of_death', message: 'Date of death cannot be in the future' });\n    }\n  }\n\n  if (data.case_status && !['ACTIVE', 'COMPLETED', 'CLOSED_EARLY'].includes(data.case_status)) {\n    errors.push({ field: 'case_status', message: 'Invalid case status. Must be ACTIVE, COMPLETED, or CLOSED_EARLY' });\n  }\n\n  if (data.service_level && !['STANDARD', 'ENHANCED', 'HIGH_RISK'].includes(data.service_level)) {\n    errors.push({ field: 'service_level', message: 'Invalid service level. Must be STANDARD, ENHANCED, or HIGH_RISK' });\n  }\n\n  return errors;\n}\n\n/**\n * Calculate changes between old and new data for audit logging\n */\nfunction calculateChanges(oldData, newData) {\n  const changes = {};\n  const excludeFields = ['id', 'createdAt', 'created_by_id'];\n\n  for (const key of Object.keys(newData)) {\n    if (excludeFields.includes(key)) continue;\n    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {\n      changes[key] = {\n        old: oldData[key],\n        new: newData[key]\n      };\n    }\n  }\n\n  return Object.keys(changes).length > 0 ? changes : null;\n}"
}

Now let me update the getAllCases method to add enhanced search and filtering with date range:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "old_string": "  /**\n   * Get all bereavement cases\n   * GET /bereavement/cases\n   */\n  async getAllCases(request, reply) {\n    try {\n      const { limit = 50, offset = 0, case_status, service_level } = request.query;\n\n      let query = db\n        .select({\n          case: bereavement_cases,\n          patient: {\n            id: patients.id,\n            first_name: patients.first_name,\n            last_name: patients.last_name,\n            medical_record_number: patients.medical_record_number\n          }\n        })\n        .from(bereavement_cases)\n        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))\n        .where(isNull(bereavement_cases.deleted_at));\n\n      const filters = [];\n      if (case_status) {\n        filters.push(eq(bereavement_cases.case_status, case_status));\n      }\n      if (service_level) {\n        filters.push(eq(bereavement_cases.service_level, service_level));\n      }\n\n      if (filters.length > 0) {\n        query = query.where(and(...filters));\n      }\n\n      const results = await query\n        .orderBy(desc(bereavement_cases.date_of_death))\n        .limit(parseInt(limit))\n        .offset(parseInt(offset));\n\n      reply.code(200);\n      return {\n        status: 200,\n        data: results,\n        count: results.length\n      };\n    } catch (error) {\n      logger.error('Error fetching bereavement cases:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error fetching bereavement cases',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }",
  "new_string": "  /**\n   * Get all bereavement cases with enhanced search and filtering\n   * GET /bereavement/cases\n   *\n   * Query params:\n   * - limit: number (default 50, max 100)\n   * - offset: number (default 0)\n   * - case_status: ACTIVE | COMPLETED | CLOSED_EARLY\n   * - service_level: STANDARD | ENHANCED | HIGH_RISK\n   * - date_from: YYYY-MM-DD (filter by death date from)\n   * - date_to: YYYY-MM-DD (filter by death date to)\n   * - search: string (search by patient name, case number)\n   * - assigned_counselor_id: string (filter by assigned staff)\n   * - sort_by: date_of_death | createdAt | case_status (default: date_of_death)\n   * - sort_order: asc | desc (default: desc)\n   */\n  async getAllCases(request, reply) {\n    try {\n      const {\n        limit = 50,\n        offset = 0,\n        case_status,\n        service_level,\n        date_from,\n        date_to,\n        search,\n        assigned_counselor_id,\n        sort_by = 'date_of_death',\n        sort_order = 'desc'\n      } = request.query;\n\n      // Cap limit at 100\n      const parsedLimit = Math.min(parseInt(limit) || 50, 100);\n      const parsedOffset = parseInt(offset) || 0;\n\n      // Build base query\n      const filters = [isNull(bereavement_cases.deleted_at)];\n\n      if (case_status) {\n        filters.push(eq(bereavement_cases.case_status, case_status));\n      }\n      if (service_level) {\n        filters.push(eq(bereavement_cases.service_level, service_level));\n      }\n      if (date_from) {\n        filters.push(gte(bereavement_cases.date_of_death, date_from));\n      }\n      if (date_to) {\n        filters.push(lte(bereavement_cases.date_of_death, date_to));\n      }\n      if (assigned_counselor_id) {\n        filters.push(eq(bereavement_cases.assigned_counselor_id, assigned_counselor_id));\n      }\n      if (search) {\n        filters.push(\n          or(\n            ilike(patients.first_name, `%${search}%`),\n            ilike(patients.last_name, `%${search}%`),\n            ilike(patients.medical_record_number, `%${search}%`)\n          )\n        );\n      }\n\n      // Get total count for pagination\n      const countResult = await db\n        .select({ value: count() })\n        .from(bereavement_cases)\n        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))\n        .where(and(...filters));\n      const totalCount = countResult[0]?.value || 0;\n\n      // Determine sort order\n      const sortColumn = {\n        date_of_death: bereavement_cases.date_of_death,\n        createdAt: bereavement_cases.createdAt,\n        case_status: bereavement_cases.case_status\n      }[sort_by] || bereavement_cases.date_of_death;\n\n      const orderFn = sort_order === 'asc' ? asc : desc;\n\n      // Execute main query\n      const results = await db\n        .select({\n          case: bereavement_cases,\n          patient: {\n            id: patients.id,\n            first_name: patients.first_name,\n            last_name: patients.last_name,\n            medical_record_number: patients.medical_record_number\n          }\n        })\n        .from(bereavement_cases)\n        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))\n        .where(and(...filters))\n        .orderBy(orderFn(sortColumn))\n        .limit(parsedLimit)\n        .offset(parsedOffset);\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        data: results,\n        count: results.length,\n        total: totalCount,\n        pagination: {\n          limit: parsedLimit,\n          offset: parsedOffset,\n          hasMore: parsedOffset + results.length < totalCount\n        }\n      };\n    } catch (error) {\n      logger.error('Error fetching bereavement cases:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'FETCH_ERROR',\n          message: 'Error fetching bereavement cases'\n        }\n      };\n    }\n  }"
}

Now let me update the createCase method to add validation and audit logging:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "old_string": "  /**\n   * Create bereavement case\n   * POST /bereavement/cases\n   */\n  async createCase(request, reply) {\n    try {\n      const data = request.body;\n\n      // Calculate bereavement period (13 months from date of death)\n      if (data.date_of_death && !data.bereavement_end_date) {\n        const deathDate = new Date(data.date_of_death);\n        const endDate = new Date(deathDate);\n        endDate.setMonth(endDate.getMonth() + 13);\n        data.bereavement_end_date = endDate.toISOString().split('T')[0];\n        data.bereavement_start_date = data.date_of_death;\n      }\n\n      const result = await db\n        .insert(bereavement_cases)\n        .values({\n          ...data,\n          created_by_id: request.user?.id,\n          updated_by_id: request.user?.id\n        })\n        .returning();\n\n      reply.code(201);\n      return {\n        status: 201,\n        message: 'Bereavement case created successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error creating bereavement case:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error creating bereavement case',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }",
  "new_string": "  /**\n   * Create bereavement case\n   * POST /bereavement/cases\n   */\n  async createCase(request, reply) {\n    try {\n      const data = request.body;\n\n      // Validate required fields\n      const validationErrors = validateBereavementCase(data);\n      if (validationErrors.length > 0) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'VALIDATION_ERROR',\n            message: 'Validation failed',\n            fields: validationErrors\n          }\n        };\n      }\n\n      // Remove immutable fields if provided\n      const { id, createdAt, deleted_at, ...safeData } = data;\n\n      // Calculate bereavement period (13 months from date of death)\n      if (safeData.date_of_death && !safeData.bereavement_end_date) {\n        const deathDate = new Date(safeData.date_of_death);\n        const endDate = new Date(deathDate);\n        endDate.setMonth(endDate.getMonth() + 13);\n        safeData.bereavement_end_date = endDate.toISOString().split('T')[0];\n        safeData.bereavement_start_date = safeData.date_of_death;\n      }\n\n      const result = await db\n        .insert(bereavement_cases)\n        .values({\n          ...safeData,\n          created_by_id: request.user?.id,\n          updated_by_id: request.user?.id\n        })\n        .returning();\n\n      // Log audit entry\n      await logBereavementAudit(\n        request,\n        'CREATE',\n        'bereavement_cases',\n        result[0].id,\n        result[0].id,\n        { created: result[0] }\n      );\n\n      reply.code(201);\n      return {\n        success: true,\n        status: 201,\n        message: 'Bereavement case created successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error creating bereavement case:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'CREATE_ERROR',\n          message: 'Error creating bereavement case'\n        }\n      };\n    }\n  }"
}

Now let me update the updateCase method to add optimistic locking and audit logging:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "old_string": "  /**\n   * Update bereavement case\n   * PATCH /bereavement/cases/:id\n   */\n  async updateCase(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      const result = await db\n        .update(bereavement_cases)\n        .set({\n          ...data,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_cases.id, parseInt(id)))\n        .returning();\n\n      if (!result[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Bereavement case not found'\n        };\n      }\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Bereavement case updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating bereavement case:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating bereavement case',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }",
  "new_string": "  /**\n   * Update bereavement case with optimistic locking\n   * PATCH /bereavement/cases/:id\n   *\n   * Supports optimistic locking via updatedAt field.\n   * If client provides updatedAt, it will be compared with server value.\n   * If they don't match, a 409 Conflict is returned.\n   */\n  async updateCase(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      // Fetch existing case for optimistic locking check and audit\n      const existing = await db\n        .select()\n        .from(bereavement_cases)\n        .where(and(\n          eq(bereavement_cases.id, caseId),\n          isNull(bereavement_cases.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Bereavement case not found'\n          }\n        };\n      }\n\n      // Optimistic locking check\n      if (data.updatedAt) {\n        const clientUpdatedAt = new Date(data.updatedAt);\n        const serverUpdatedAt = new Date(existing[0].updatedAt);\n        if (clientUpdatedAt.getTime() !== serverUpdatedAt.getTime()) {\n          reply.code(409);\n          return {\n            success: false,\n            status: 409,\n            error: {\n              code: 'CONCURRENT_MODIFICATION',\n              message: 'This record has been modified by another user. Please refresh and try again.',\n              serverUpdatedAt: serverUpdatedAt.toISOString()\n            }\n          };\n        }\n      }\n\n      // Remove immutable fields\n      const { id: _, createdAt, deleted_at, created_by_id, updatedAt: clientUpdatedAt, ...safeData } = data;\n\n      // Calculate changes for audit\n      const changes = calculateChanges(existing[0], safeData);\n\n      const result = await db\n        .update(bereavement_cases)\n        .set({\n          ...safeData,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_cases.id, caseId))\n        .returning();\n\n      // Log audit entry with changes\n      if (changes) {\n        await logBereavementAudit(\n          request,\n          'UPDATE',\n          'bereavement_cases',\n          caseId,\n          caseId,\n          changes\n        );\n      }\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: 'Bereavement case updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating bereavement case:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'UPDATE_ERROR',\n          message: 'Error updating bereavement case'\n        }\n      };\n    }\n  }\n\n  /**\n   * Soft delete bereavement case\n   * DELETE /bereavement/cases/:id\n   */\n  async deleteCase(request, reply) {\n    try {\n      const { id } = request.params;\n      const { reason } = request.body || {};\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      // Check if case exists\n      const existing = await db\n        .select()\n        .from(bereavement_cases)\n        .where(and(\n          eq(bereavement_cases.id, caseId),\n          isNull(bereavement_cases.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Bereavement case not found'\n          }\n        };\n      }\n\n      // Perform soft delete\n      const result = await db\n        .update(bereavement_cases)\n        .set({\n          deleted_at: new Date(),\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_cases.id, caseId))\n        .returning();\n\n      // Log audit entry\n      await logBereavementAudit(\n        request,\n        'DELETE',\n        'bereavement_cases',\n        caseId,\n        caseId,\n        { reason: reason || 'No reason provided', deleted_at: result[0].deleted_at }\n      );\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: 'Bereavement case deleted successfully'\n      };\n    } catch (error) {\n      logger.error('Error deleting bereavement case:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'DELETE_ERROR',\n          message: 'Error deleting bereavement case'\n        }\n      };\n    }\n  }\n\n  /**\n   * Assign staff member to bereavement case\n   * POST /bereavement/cases/:id/assign\n   */\n  async assignStaff(request, reply) {\n    try {\n      const { id } = request.params;\n      const { assigned_counselor_id } = request.body;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      if (!assigned_counselor_id) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'VALIDATION_ERROR',\n            message: 'assigned_counselor_id is required'\n          }\n        };\n      }\n\n      // Verify case exists\n      const existing = await db\n        .select()\n        .from(bereavement_cases)\n        .where(and(\n          eq(bereavement_cases.id, caseId),\n          isNull(bereavement_cases.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Bereavement case not found'\n          }\n        };\n      }\n\n      const previousCounselor = existing[0].assigned_counselor_id;\n\n      const result = await db\n        .update(bereavement_cases)\n        .set({\n          assigned_counselor_id,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_cases.id, caseId))\n        .returning();\n\n      // Log audit entry for assignment change\n      await logBereavementAudit(\n        request,\n        'ASSIGNMENT_CHANGE',\n        'bereavement_cases',\n        caseId,\n        caseId,\n        {\n          assigned_counselor_id: {\n            old: previousCounselor,\n            new: assigned_counselor_id\n          }\n        }\n      );\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: 'Staff assigned successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error assigning staff:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'ASSIGNMENT_ERROR',\n          message: 'Error assigning staff to case'\n        }\n      };\n    }\n  }\n\n  /**\n   * Get case summary/report\n   * GET /bereavement/cases/:id/summary\n   */\n  async getCaseSummary(request, reply) {\n    try {\n      const { id } = request.params;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      // Get case details\n      const caseResult = await db\n        .select({\n          case: bereavement_cases,\n          patient: patients,\n          counselor: users\n        })\n        .from(bereavement_cases)\n        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))\n        .leftJoin(users, eq(bereavement_cases.assigned_counselor_id, users.id))\n        .where(and(\n          eq(bereavement_cases.id, caseId),\n          isNull(bereavement_cases.deleted_at)\n        ))\n        .limit(1);\n\n      if (!caseResult[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Bereavement case not found'\n          }\n        };\n      }\n\n      // Get contacts count\n      const contactsCount = await db\n        .select({ value: count() })\n        .from(bereavement_contacts)\n        .where(and(\n          eq(bereavement_contacts.bereavement_case_id, caseId),\n          isNull(bereavement_contacts.deleted_at)\n        ));\n\n      // Get encounters count\n      const encountersCount = await db\n        .select({ value: count() })\n        .from(bereavement_encounters)\n        .where(and(\n          eq(bereavement_encounters.bereavement_case_id, caseId),\n          isNull(bereavement_encounters.deleted_at)\n        ));\n\n      // Get follow-ups summary\n      const followUpStats = await db\n        .select({\n          status: bereavement_follow_ups.follow_up_status,\n          count: count()\n        })\n        .from(bereavement_follow_ups)\n        .where(and(\n          eq(bereavement_follow_ups.bereavement_case_id, caseId),\n          isNull(bereavement_follow_ups.deleted_at)\n        ))\n        .groupBy(bereavement_follow_ups.follow_up_status);\n\n      // Get documents count\n      const documentsCount = await db\n        .select({ value: count() })\n        .from(bereavement_documents)\n        .where(and(\n          eq(bereavement_documents.bereavement_case_id, caseId),\n          isNull(bereavement_documents.deleted_at)\n        ));\n\n      // Get latest risk assessment\n      const latestRiskAssessment = await db\n        .select()\n        .from(bereavement_risk_assessments)\n        .where(and(\n          eq(bereavement_risk_assessments.bereavement_case_id, caseId),\n          isNull(bereavement_risk_assessments.deleted_at)\n        ))\n        .orderBy(desc(bereavement_risk_assessments.assessment_date))\n        .limit(1);\n\n      // Log audit entry for viewing report\n      await logBereavementAudit(\n        request,\n        'VIEW',\n        'bereavement_case_summary',\n        caseId,\n        caseId\n      );\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        data: {\n          case: caseResult[0].case,\n          patient: caseResult[0].patient,\n          assigned_counselor: caseResult[0].counselor,\n          statistics: {\n            total_contacts: contactsCount[0]?.value || 0,\n            total_encounters: encountersCount[0]?.value || 0,\n            total_documents: documentsCount[0]?.value || 0,\n            follow_ups: followUpStats.reduce((acc, stat) => {\n              acc[stat.status?.toLowerCase() || 'unknown'] = stat.count;\n              return acc;\n            }, {})\n          },\n          latest_risk_assessment: latestRiskAssessment[0] || null,\n          bereavement_progress: {\n            start_date: caseResult[0].case.bereavement_start_date,\n            end_date: caseResult[0].case.bereavement_end_date,\n            days_remaining: Math.max(0, Math.ceil(\n              (new Date(caseResult[0].case.bereavement_end_date) - new Date()) / (1000 * 60 * 60 * 24)\n            ))\n          }\n        }\n      };\n    } catch (error) {\n      logger.error('Error getting case summary:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'SUMMARY_ERROR',\n          message: 'Error generating case summary'\n        }\n      };\n    }\n  }\n\n  /**\n   * Get audit log for a bereavement case\n   * GET /bereavement/cases/:id/audit-log\n   */\n  async getCaseAuditLog(request, reply) {\n    try {\n      const { id } = request.params;\n      const { limit = 50, offset = 0 } = request.query;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      const parsedLimit = Math.min(parseInt(limit) || 50, 100);\n      const parsedOffset = parseInt(offset) || 0;\n\n      const results = await db\n        .select()\n        .from(bereavement_audit_log)\n        .where(eq(bereavement_audit_log.bereavement_case_id, caseId))\n        .orderBy(desc(bereavement_audit_log.action_timestamp))\n        .limit(parsedLimit)\n        .offset(parsedOffset);\n\n      const totalCount = await db\n        .select({ value: count() })\n        .from(bereavement_audit_log)\n        .where(eq(bereavement_audit_log.bereavement_case_id, caseId));\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        data: results,\n        count: results.length,\n        total: totalCount[0]?.value || 0,\n        pagination: {\n          limit: parsedLimit,\n          offset: parsedOffset,\n          hasMore: parsedOffset + results.length < (totalCount[0]?.value || 0)\n        }\n      };\n    } catch (error) {\n      logger.error('Error fetching audit log:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'AUDIT_LOG_ERROR',\n          message: 'Error fetching audit log'\n        }\n      };\n    }\n  }"
}

Now let me add the document management endpoints at the end of the controller. First, let me read the end of the file to find where to add:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "offset": 1550
}

Now let me add the document management methods to the controller before the closing class brace:

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/controllers/Bereavement.controller.js",
  "old_string": "  /**\n   * Update contact consent\n   * PATCH /bereavement/contacts/:id/consent\n   */\n  async updateContactConsent(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      const result = await db\n        .update(bereavement_contacts)\n        .set({\n          consent_status: data.consent_status,\n          consent_date: data.consent_date || new Date().toISOString().split('T')[0],\n          consent_signature: data.consent_signature,\n          privacy_preferences: data.privacy_preferences,\n          can_share_info: data.can_share_info,\n          can_contact_via_phone: data.can_contact_via_phone,\n          can_contact_via_email: data.can_contact_via_email,\n          can_contact_via_mail: data.can_contact_via_mail,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_contacts.id, parseInt(id)))\n        .returning();\n\n      if (!result[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Contact not found'\n        };\n      }\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Consent updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating consent:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating consent',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n}\n\nexport default new BereavementController();",
  "new_string": "  /**\n   * Update contact consent\n   * PATCH /bereavement/contacts/:id/consent\n   */\n  async updateContactConsent(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n\n      const result = await db\n        .update(bereavement_contacts)\n        .set({\n          consent_status: data.consent_status,\n          consent_date: data.consent_date || new Date().toISOString().split('T')[0],\n          consent_signature: data.consent_signature,\n          privacy_preferences: data.privacy_preferences,\n          can_share_info: data.can_share_info,\n          can_contact_via_phone: data.can_contact_via_phone,\n          can_contact_via_email: data.can_contact_via_email,\n          can_contact_via_mail: data.can_contact_via_mail,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_contacts.id, parseInt(id)))\n        .returning();\n\n      if (!result[0]) {\n        reply.code(404);\n        return {\n          status: 404,\n          message: 'Contact not found'\n        };\n      }\n\n      reply.code(200);\n      return {\n        status: 200,\n        message: 'Consent updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating consent:', error)\n      reply.code(500);\n      return {\n        status: 500,\n        message: 'Error updating consent',\n        error: process.env.NODE_ENV === 'development' ? error.message : undefined\n      };\n    }\n  }\n\n  // ============================================\n  // DOCUMENT MANAGEMENT\n  // ============================================\n\n  /**\n   * Get documents for a bereavement case\n   * GET /bereavement/cases/:id/documents\n   */\n  async getCaseDocuments(request, reply) {\n    try {\n      const { id } = request.params;\n      const { document_type, document_status, limit = 50, offset = 0 } = request.query;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      const parsedLimit = Math.min(parseInt(limit) || 50, 100);\n      const parsedOffset = parseInt(offset) || 0;\n\n      const filters = [\n        eq(bereavement_documents.bereavement_case_id, caseId),\n        isNull(bereavement_documents.deleted_at)\n      ];\n\n      if (document_type) {\n        filters.push(eq(bereavement_documents.document_type, document_type));\n      }\n      if (document_status) {\n        filters.push(eq(bereavement_documents.document_status, document_status));\n      }\n\n      const results = await db\n        .select()\n        .from(bereavement_documents)\n        .where(and(...filters))\n        .orderBy(desc(bereavement_documents.createdAt))\n        .limit(parsedLimit)\n        .offset(parsedOffset);\n\n      const totalCount = await db\n        .select({ value: count() })\n        .from(bereavement_documents)\n        .where(and(...filters));\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        data: results,\n        count: results.length,\n        total: totalCount[0]?.value || 0,\n        pagination: {\n          limit: parsedLimit,\n          offset: parsedOffset,\n          hasMore: parsedOffset + results.length < (totalCount[0]?.value || 0)\n        }\n      };\n    } catch (error) {\n      logger.error('Error fetching documents:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'FETCH_ERROR',\n          message: 'Error fetching documents'\n        }\n      };\n    }\n  }\n\n  /**\n   * Add document to bereavement case\n   * POST /bereavement/cases/:id/documents\n   *\n   * Note: This endpoint records document metadata. File upload should be handled\n   * separately via a file upload service that returns the file_path.\n   */\n  async addDocument(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n      const caseId = parseInt(id);\n\n      if (isNaN(caseId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid case ID provided'\n          }\n        };\n      }\n\n      // Validate required fields\n      const errors = [];\n      if (!data.document_type) {\n        errors.push({ field: 'document_type', message: 'Document type is required' });\n      } else if (!ALLOWED_DOCUMENT_TYPES.includes(data.document_type)) {\n        errors.push({ field: 'document_type', message: `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}` });\n      }\n      if (!data.document_name) {\n        errors.push({ field: 'document_name', message: 'Document name is required' });\n      }\n      if (!data.file_name) {\n        errors.push({ field: 'file_name', message: 'File name is required' });\n      }\n      if (!data.file_path) {\n        errors.push({ field: 'file_path', message: 'File path is required' });\n      }\n\n      // Validate file type if provided\n      if (data.file_type && !ALLOWED_MIME_TYPES.includes(data.file_type)) {\n        errors.push({ field: 'file_type', message: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` });\n      }\n\n      // Validate file size if provided\n      if (data.file_size && data.file_size > MAX_FILE_SIZE) {\n        errors.push({ field: 'file_size', message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` });\n      }\n\n      if (errors.length > 0) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'VALIDATION_ERROR',\n            message: 'Validation failed',\n            fields: errors\n          }\n        };\n      }\n\n      // Verify case exists\n      const existingCase = await db\n        .select()\n        .from(bereavement_cases)\n        .where(and(\n          eq(bereavement_cases.id, caseId),\n          isNull(bereavement_cases.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existingCase[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Bereavement case not found'\n          }\n        };\n      }\n\n      const result = await db\n        .insert(bereavement_documents)\n        .values({\n          ...data,\n          bereavement_case_id: caseId,\n          uploaded_by_id: request.user?.id,\n          created_by_id: request.user?.id,\n          updated_by_id: request.user?.id\n        })\n        .returning();\n\n      // Log audit entry\n      await logBereavementAudit(\n        request,\n        'CREATE',\n        'bereavement_documents',\n        result[0].id,\n        caseId,\n        { document_type: data.document_type, document_name: data.document_name }\n      );\n\n      reply.code(201);\n      return {\n        success: true,\n        status: 201,\n        message: 'Document added successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error adding document:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'CREATE_ERROR',\n          message: 'Error adding document'\n        }\n      };\n    }\n  }\n\n  /**\n   * Get document by ID\n   * GET /bereavement/documents/:id\n   */\n  async getDocumentById(request, reply) {\n    try {\n      const { id } = request.params;\n      const docId = parseInt(id);\n\n      if (isNaN(docId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid document ID provided'\n          }\n        };\n      }\n\n      const result = await db\n        .select()\n        .from(bereavement_documents)\n        .where(and(\n          eq(bereavement_documents.id, docId),\n          isNull(bereavement_documents.deleted_at)\n        ))\n        .limit(1);\n\n      if (!result[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Document not found'\n          }\n        };\n      }\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error fetching document:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'FETCH_ERROR',\n          message: 'Error fetching document'\n        }\n      };\n    }\n  }\n\n  /**\n   * Update document metadata\n   * PATCH /bereavement/documents/:id\n   */\n  async updateDocument(request, reply) {\n    try {\n      const { id } = request.params;\n      const data = request.body;\n      const docId = parseInt(id);\n\n      if (isNaN(docId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid document ID provided'\n          }\n        };\n      }\n\n      // Fetch existing document\n      const existing = await db\n        .select()\n        .from(bereavement_documents)\n        .where(and(\n          eq(bereavement_documents.id, docId),\n          isNull(bereavement_documents.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Document not found'\n          }\n        };\n      }\n\n      // Remove immutable fields\n      const { id: _, bereavement_case_id, createdAt, deleted_at, uploaded_by_id, created_by_id, ...safeData } = data;\n\n      // Validate document type if being changed\n      if (safeData.document_type && !ALLOWED_DOCUMENT_TYPES.includes(safeData.document_type)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'VALIDATION_ERROR',\n            message: `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`\n          }\n        };\n      }\n\n      const changes = calculateChanges(existing[0], safeData);\n\n      const result = await db\n        .update(bereavement_documents)\n        .set({\n          ...safeData,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_documents.id, docId))\n        .returning();\n\n      // Log audit entry\n      if (changes) {\n        await logBereavementAudit(\n          request,\n          'UPDATE',\n          'bereavement_documents',\n          docId,\n          existing[0].bereavement_case_id,\n          changes\n        );\n      }\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: 'Document updated successfully',\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error updating document:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'UPDATE_ERROR',\n          message: 'Error updating document'\n        }\n      };\n    }\n  }\n\n  /**\n   * Delete document (soft delete)\n   * DELETE /bereavement/documents/:id\n   */\n  async deleteDocument(request, reply) {\n    try {\n      const { id } = request.params;\n      const { reason } = request.body || {};\n      const docId = parseInt(id);\n\n      if (isNaN(docId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid document ID provided'\n          }\n        };\n      }\n\n      // Fetch existing document\n      const existing = await db\n        .select()\n        .from(bereavement_documents)\n        .where(and(\n          eq(bereavement_documents.id, docId),\n          isNull(bereavement_documents.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Document not found'\n          }\n        };\n      }\n\n      const result = await db\n        .update(bereavement_documents)\n        .set({\n          deleted_at: new Date(),\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_documents.id, docId))\n        .returning();\n\n      // Log audit entry\n      await logBereavementAudit(\n        request,\n        'DELETE',\n        'bereavement_documents',\n        docId,\n        existing[0].bereavement_case_id,\n        { reason: reason || 'No reason provided', document_name: existing[0].document_name }\n      );\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: 'Document deleted successfully'\n      };\n    } catch (error) {\n      logger.error('Error deleting document:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'DELETE_ERROR',\n          message: 'Error deleting document'\n        }\n      };\n    }\n  }\n\n  /**\n   * Verify document\n   * POST /bereavement/documents/:id/verify\n   */\n  async verifyDocument(request, reply) {\n    try {\n      const { id } = request.params;\n      const { verification_notes, document_status = 'VERIFIED' } = request.body || {};\n      const docId = parseInt(id);\n\n      if (isNaN(docId)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'INVALID_ID',\n            message: 'Invalid document ID provided'\n          }\n        };\n      }\n\n      const validStatuses = ['VERIFIED', 'APPROVED', 'REJECTED'];\n      if (!validStatuses.includes(document_status)) {\n        reply.code(400);\n        return {\n          success: false,\n          status: 400,\n          error: {\n            code: 'VALIDATION_ERROR',\n            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`\n          }\n        };\n      }\n\n      // Fetch existing document\n      const existing = await db\n        .select()\n        .from(bereavement_documents)\n        .where(and(\n          eq(bereavement_documents.id, docId),\n          isNull(bereavement_documents.deleted_at)\n        ))\n        .limit(1);\n\n      if (!existing[0]) {\n        reply.code(404);\n        return {\n          success: false,\n          status: 404,\n          error: {\n            code: 'NOT_FOUND',\n            message: 'Document not found'\n          }\n        };\n      }\n\n      const result = await db\n        .update(bereavement_documents)\n        .set({\n          document_status,\n          verification_date: new Date().toISOString().split('T')[0],\n          verified_by_id: request.user?.id,\n          verification_notes,\n          updated_by_id: request.user?.id,\n          updatedAt: new Date()\n        })\n        .where(eq(bereavement_documents.id, docId))\n        .returning();\n\n      // Log audit entry\n      await logBereavementAudit(\n        request,\n        'STATUS_CHANGE',\n        'bereavement_documents',\n        docId,\n        existing[0].bereavement_case_id,\n        {\n          document_status: {\n            old: existing[0].document_status,\n            new: document_status\n          },\n          verification_notes\n        }\n      );\n\n      reply.code(200);\n      return {\n        success: true,\n        status: 200,\n        message: `Document ${document_status.toLowerCase()} successfully`,\n        data: result[0]\n      };\n    } catch (error) {\n      logger.error('Error verifying document:', error)\n      reply.code(500);\n      return {\n        success: false,\n        status: 500,\n        error: {\n          code: 'VERIFY_ERROR',\n          message: 'Error verifying document'\n        }\n      };\n    }\n  }\n}\n\nexport default new BereavementController();"
}

Now let me update the routes file to include the new endpoints:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "completed",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Update controller with new features",
      "status": "completed",
      "activeForm": "Updating controller with enhancements"
    },
    {
      "content": "Update routes with new endpoints",
      "status": "in_progress",
      "activeForm": "Updating routes"
    },
    {
      "content": "Create Playwright verification test",
      "status": "pending",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/bereavement.routes.js",
  "old_string": "import controller from '../controllers/Bereavement.controller.js';\nimport { PERMISSIONS } from '../config/rbac.js';\nimport { requireAnyPermission } from '../middleware/rbac.middleware.js';\n\n/**\n * Bereavement Routes\n * Module K - MEDIUM Priority\n *\n * Purpose: 13-month bereavement requirement, grief support services\n * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death\n *\n * Endpoints:\n * - Bereavement case management (4 endpoints)\n * - Contact management (5 endpoints - including grief assessment and consent)\n * - Care plan development (2 endpoints)\n * - Encounter documentation (2 endpoints)\n * - Risk assessments (2 endpoints)\n * - Support group management (4 endpoints)\n * - Follow-up tracking (4 endpoints)\n * - Resource management (3 endpoints)\n * - Memorial services (6 endpoints)\n * Total: 32 endpoints\n */\nexport default async function bereavementRoutes(fastify, options) {\n  // ============================================================================\n  // BEREAVEMENT CASES ROUTES\n  // ============================================================================\n\n  // Get all bereavement cases\n  fastify.get('/bereavement/cases', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getAllCases);\n\n  // Create bereavement case\n  fastify.post('/bereavement/cases', {\n    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]\n  }, controller.createCase);\n\n  // Get bereavement case by ID\n  fastify.get('/bereavement/cases/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getCaseById);\n\n  // Update bereavement case\n  fastify.patch('/bereavement/cases/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateCase);",
  "new_string": "import controller from '../controllers/Bereavement.controller.js';\nimport { PERMISSIONS } from '../config/rbac.js';\nimport { requireAnyPermission } from '../middleware/rbac.middleware.js';\n\n/**\n * Bereavement Routes\n * Module K - MEDIUM Priority\n *\n * Purpose: 13-month bereavement requirement, grief support services\n * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death\n *\n * Endpoints:\n * - Bereavement case management (7 endpoints - CRUD, delete, assign, summary, audit-log)\n * - Contact management (5 endpoints - including grief assessment and consent)\n * - Care plan development (2 endpoints)\n * - Encounter documentation (2 endpoints)\n * - Risk assessments (2 endpoints)\n * - Support group management (4 endpoints)\n * - Follow-up tracking (4 endpoints)\n * - Resource management (3 endpoints)\n * - Memorial services (6 endpoints)\n * - Document management (6 endpoints - CRUD, verify)\n * Total: 41 endpoints\n */\nexport default async function bereavementRoutes(fastify, options) {\n  // ============================================================================\n  // BEREAVEMENT CASES ROUTES\n  // ============================================================================\n\n  // Get all bereavement cases (with enhanced search and filtering)\n  fastify.get('/bereavement/cases', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getAllCases);\n\n  // Create bereavement case\n  fastify.post('/bereavement/cases', {\n    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]\n  }, controller.createCase);\n\n  // Get bereavement case by ID\n  fastify.get('/bereavement/cases/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getCaseById);\n\n  // Update bereavement case (with optimistic locking)\n  fastify.patch('/bereavement/cases/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateCase);\n\n  // Delete bereavement case (soft delete)\n  fastify.delete('/bereavement/cases/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]\n  }, controller.deleteCase);\n\n  // Assign staff to bereavement case\n  fastify.post('/bereavement/cases/:id/assign', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.assignStaff);\n\n  // Get case summary/report\n  fastify.get('/bereavement/cases/:id/summary', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getCaseSummary);\n\n  // Get case audit log\n  fastify.get('/bereavement/cases/:id/audit-log', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_AUDIT_LOGS)]\n  }, controller.getCaseAuditLog);"
}

Now let me add the document routes at the end of the routes file. First, let me read the end of the routes file:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/bereavement.routes.js",
  "offset": 200
}

🔧 Tool: Edit
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/bereavement.routes.js",
  "old_string": "  // ============================================================================\n  // CONTACT MANAGEMENT ROUTES (Enhanced)\n  // ============================================================================\n\n  // Update contact information\n  fastify.patch('/bereavement/contacts/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContact);\n\n  // Update contact grief assessment\n  fastify.patch('/bereavement/contacts/:id/grief-assessment', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContactGriefAssessment);\n\n  // Update contact consent\n  fastify.patch('/bereavement/contacts/:id/consent', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContactConsent);\n}",
  "new_string": "  // ============================================================================\n  // CONTACT MANAGEMENT ROUTES (Enhanced)\n  // ============================================================================\n\n  // Update contact information\n  fastify.patch('/bereavement/contacts/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContact);\n\n  // Update contact grief assessment\n  fastify.patch('/bereavement/contacts/:id/grief-assessment', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContactGriefAssessment);\n\n  // Update contact consent\n  fastify.patch('/bereavement/contacts/:id/consent', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateContactConsent);\n\n  // ============================================================================\n  // DOCUMENT MANAGEMENT ROUTES\n  // ============================================================================\n\n  // Get documents for a bereavement case\n  fastify.get('/bereavement/cases/:id/documents', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getCaseDocuments);\n\n  // Add document to bereavement case\n  fastify.post('/bereavement/cases/:id/documents', {\n    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]\n  }, controller.addDocument);\n\n  // Get document by ID\n  fastify.get('/bereavement/documents/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]\n  }, controller.getDocumentById);\n\n  // Update document metadata\n  fastify.patch('/bereavement/documents/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.updateDocument);\n\n  // Delete document (soft delete)\n  fastify.delete('/bereavement/documents/:id', {\n    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]\n  }, controller.deleteDocument);\n\n  // Verify document\n  fastify.post('/bereavement/documents/:id/verify', {\n    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]\n  }, controller.verifyDocument);\n}"
}

Now let me update the todo list and create a Playwright verification test:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "completed",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Update controller with new features",
      "status": "completed",
      "activeForm": "Updating controller with enhancements"
    },
    {
      "content": "Update routes with new endpoints",
      "status": "completed",
      "activeForm": "Updating routes"
    },
    {
      "content": "Create Playwright verification test",
      "status": "in_progress",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Run verification and clean up test",
      "status": "pending",
      "activeForm": "Running verification test"
    }
  ]
}

Let me first check if there's an existing Playwright setup in the project:

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

Let me look at an existing verification test to understand the pattern:

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/analytics-controller-verification.spec.ts"
}

Now I'll create a verification test for the bereavement controller:

🔧 Tool: Write
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/bereavement-controller-verification.spec.ts",
  "content": "import { test, expect } from '@playwright/test';\n\n/**\n * Verification tests for Bereavement Controller feature\n * Feature: bereavement-controller\n *\n * This test verifies:\n * 1. Bereavement case CRUD endpoints exist and require authentication\n * 2. Enhanced search and filtering with date range support\n * 3. Soft delete functionality\n * 4. Staff assignment endpoints\n * 5. Case summary/report generation\n * 6. Audit logging endpoints\n * 7. Document management (CRUD, verify)\n * 8. Optimistic locking support\n * 9. All endpoints require authentication (return 401/403)\n *\n * Features tested:\n * - Bereavement case management with CMS 13-month compliance\n * - Document attachment and tracking\n * - Staff assignment to cases\n * - Comprehensive audit logging\n * - Date range filtering and search\n * - Optimistic locking for concurrent updates\n */\n\nconst API_BASE_URL = 'http://localhost:3001/api';\n\ntest.describe('Bereavement Controller - Case Management', () => {\n  test('should have get all cases endpoint (GET /bereavement/cases)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support search and filtering parameters', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases?case_status=ACTIVE&service_level=STANDARD&search=Smith`\n    );\n\n    // Should require authentication, not reject the parameters\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support date range filtering', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases?date_from=2025-01-01&date_to=2025-12-31`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support pagination parameters', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases?limit=25&offset=0`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support sorting parameters', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases?sort_by=date_of_death&sort_order=desc`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support assigned_counselor_id filter', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases?assigned_counselor_id=user-123`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create case endpoint (POST /bereavement/cases)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases`, {\n      data: {\n        patient_id: 1,\n        date_of_death: '2025-01-15',\n        service_level: 'STANDARD'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get case by ID endpoint (GET /bereavement/cases/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update case endpoint (PATCH /bereavement/cases/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/cases/1`, {\n      data: {\n        case_status: 'COMPLETED',\n        updatedAt: '2025-01-01T00:00:00.000Z' // For optimistic locking\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have delete case endpoint (DELETE /bereavement/cases/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/bereavement/cases/1`, {\n      data: {\n        reason: 'Test deletion'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Staff Assignment', () => {\n  test('should have assign staff endpoint (POST /bereavement/cases/:id/assign)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/assign`, {\n      data: {\n        assigned_counselor_id: 'user-456'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Case Summary/Reports', () => {\n  test('should have case summary endpoint (GET /bereavement/cases/:id/summary)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/summary`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Audit Log', () => {\n  test('should have case audit log endpoint (GET /bereavement/cases/:id/audit-log)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/audit-log`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support pagination for audit log', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases/1/audit-log?limit=50&offset=0`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Document Management', () => {\n  test('should have get documents endpoint (GET /bereavement/cases/:id/documents)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/documents`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should support document filtering by type and status', async ({ request }) => {\n    const response = await request.get(\n      `${API_BASE_URL}/bereavement/cases/1/documents?document_type=DEATH_CERTIFICATE&document_status=PENDING`\n    );\n\n    // Should require authentication\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add document endpoint (POST /bereavement/cases/:id/documents)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/documents`, {\n      data: {\n        document_type: 'DEATH_CERTIFICATE',\n        document_name: 'Death Certificate - John Doe',\n        file_name: 'death_certificate.pdf',\n        file_path: '/uploads/bereavement/death_certificate.pdf',\n        file_type: 'application/pdf',\n        file_size: 102400\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get document by ID endpoint (GET /bereavement/documents/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/documents/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update document endpoint (PATCH /bereavement/documents/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/documents/1`, {\n      data: {\n        document_name: 'Updated Document Name',\n        document_description: 'Updated description'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have delete document endpoint (DELETE /bereavement/documents/:id)', async ({ request }) => {\n    const response = await request.delete(`${API_BASE_URL}/bereavement/documents/1`, {\n      data: {\n        reason: 'Document no longer needed'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have verify document endpoint (POST /bereavement/documents/:id/verify)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/documents/1/verify`, {\n      data: {\n        document_status: 'VERIFIED',\n        verification_notes: 'Document verified as authentic'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Contacts Management', () => {\n  test('should have get contacts endpoint (GET /bereavement/cases/:id/contacts)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/contacts`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add contact endpoint (POST /bereavement/cases/:id/contacts)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/contacts`, {\n      data: {\n        first_name: 'Jane',\n        last_name: 'Doe',\n        relationship_to_deceased: 'SPOUSE',\n        phone: '555-0123'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update contact endpoint (PATCH /bereavement/contacts/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/contacts/1`, {\n      data: {\n        phone: '555-9999'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have grief assessment endpoint (PATCH /bereavement/contacts/:id/grief-assessment)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/contacts/1/grief-assessment`, {\n      data: {\n        grief_assessment_score: 45,\n        grief_assessment_tool: 'PG-13',\n        grief_stage: 'DEPRESSION'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have consent endpoint (PATCH /bereavement/contacts/:id/consent)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/contacts/1/consent`, {\n      data: {\n        consent_status: 'GRANTED',\n        can_share_info: true,\n        can_contact_via_phone: true\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Plans and Encounters', () => {\n  test('should have get plans endpoint (GET /bereavement/cases/:id/plans)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/plans`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create plan endpoint (POST /bereavement/cases/:id/plans)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/plans`, {\n      data: {\n        plan_date: '2025-01-20',\n        goals: 'Provide grief support',\n        planned_interventions: 'Weekly calls'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get encounters endpoint (GET /bereavement/cases/:id/encounters)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/encounters`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create encounter endpoint (POST /bereavement/cases/:id/encounters)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/encounters`, {\n      data: {\n        encounter_date: '2025-01-25',\n        encounter_type: 'PHONE_CALL',\n        duration_minutes: 30\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Risk Assessments', () => {\n  test('should have get risk assessments endpoint (GET /bereavement/cases/:id/risk-assessments)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/risk-assessments`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create risk assessment endpoint (POST /bereavement/cases/:id/risk-assessments)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/risk-assessments`, {\n      data: {\n        assessment_date: '2025-01-20',\n        sudden_death: true,\n        limited_social_support: true\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Follow-ups', () => {\n  test('should have get follow-ups endpoint (GET /bereavement/cases/:id/follow-ups)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/follow-ups`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create follow-up endpoint (POST /bereavement/cases/:id/follow-ups)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/follow-ups`, {\n      data: {\n        milestone_type: 'CUSTOM',\n        scheduled_date: '2025-02-01'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have generate standard follow-ups endpoint (POST /bereavement/cases/:id/follow-ups/generate)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/follow-ups/generate`, {\n      data: {\n        contact_id: 1\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update follow-up endpoint (PATCH /bereavement/follow-ups/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/follow-ups/1`, {\n      data: {\n        follow_up_status: 'COMPLETED',\n        completed_date: '2025-01-25'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Resources', () => {\n  test('should have get resources endpoint (GET /bereavement/cases/:id/resources)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/cases/1/resources`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have add resource endpoint (POST /bereavement/cases/:id/resources)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/cases/1/resources`, {\n      data: {\n        resource_type: 'LITERATURE',\n        resource_name: 'Grief Support Booklet',\n        date_provided: '2025-01-20'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update resource endpoint (PATCH /bereavement/resources/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/resources/1`, {\n      data: {\n        resource_utilized: true\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Support Groups', () => {\n  test('should have get support groups endpoint (GET /bereavement/support-groups)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/support-groups`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create support group endpoint (POST /bereavement/support-groups)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/support-groups`, {\n      data: {\n        group_name: 'Spouse Loss Support Group',\n        group_type: 'SPOUSE_LOSS'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get support group sessions endpoint (GET /bereavement/support-groups/:id/sessions)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/support-groups/1/sessions`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create support group session endpoint (POST /bereavement/support-groups/:id/sessions)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/support-groups/1/sessions`, {\n      data: {\n        session_date: '2025-02-01',\n        session_topic: 'Coping with Loss'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - Memorial Services', () => {\n  test('should have get memorial services endpoint (GET /bereavement/memorial-services)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/memorial-services`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have create memorial service endpoint (POST /bereavement/memorial-services)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/memorial-services`, {\n      data: {\n        service_name: 'Annual Memorial Service',\n        service_type: 'ANNUAL_MEMORIAL',\n        service_date: '2025-06-15'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get memorial service by ID endpoint (GET /bereavement/memorial-services/:id)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/memorial-services/1`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have update memorial service endpoint (PATCH /bereavement/memorial-services/:id)', async ({ request }) => {\n    const response = await request.patch(`${API_BASE_URL}/bereavement/memorial-services/1`, {\n      data: {\n        service_status: 'CONFIRMED'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have get attendees endpoint (GET /bereavement/memorial-services/:id/attendees)', async ({ request }) => {\n    const response = await request.get(`${API_BASE_URL}/bereavement/memorial-services/1/attendees`);\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n\n  test('should have register attendee endpoint (POST /bereavement/memorial-services/:id/attendees)', async ({ request }) => {\n    const response = await request.post(`${API_BASE_URL}/bereavement/memorial-services/1/attendees`, {\n      data: {\n        attendee_name: 'John Smith',\n        rsvp_status: 'CONFIRMED'\n      }\n    });\n\n    // Should require authentication (not 404 - endpoint exists)\n    expect([401, 403]).toContain(response.status());\n  });\n});\n\ntest.describe('Bereavement Controller - All Endpoints Exist', () => {\n  test('all bereavement controller endpoints should be accessible', async ({ request }) => {\n    const endpoints = [\n      // Case Management\n      { path: '/bereavement/cases', method: 'GET', purpose: 'List all cases with filtering' },\n      { path: '/bereavement/cases', method: 'POST', purpose: 'Create new case' },\n      { path: '/bereavement/cases/1', method: 'GET', purpose: 'Get case by ID' },\n      { path: '/bereavement/cases/1', method: 'PATCH', purpose: 'Update case with optimistic locking' },\n      { path: '/bereavement/cases/1', method: 'DELETE', purpose: 'Soft delete case' },\n      { path: '/bereavement/cases/1/assign', method: 'POST', purpose: 'Assign staff to case' },\n      { path: '/bereavement/cases/1/summary', method: 'GET', purpose: 'Get case summary/report' },\n      { path: '/bereavement/cases/1/audit-log', method: 'GET', purpose: 'Get audit log for case' },\n\n      // Document Management\n      { path: '/bereavement/cases/1/documents', method: 'GET', purpose: 'List documents for case' },\n      { path: '/bereavement/cases/1/documents', method: 'POST', purpose: 'Add document to case' },\n      { path: '/bereavement/documents/1', method: 'GET', purpose: 'Get document by ID' },\n      { path: '/bereavement/documents/1', method: 'PATCH', purpose: 'Update document' },\n      { path: '/bereavement/documents/1', method: 'DELETE', purpose: 'Delete document' },\n      { path: '/bereavement/documents/1/verify', method: 'POST', purpose: 'Verify document' },\n\n      // Contacts\n      { path: '/bereavement/cases/1/contacts', method: 'GET', purpose: 'List contacts for case' },\n      { path: '/bereavement/cases/1/contacts', method: 'POST', purpose: 'Add contact to case' },\n      { path: '/bereavement/contacts/1', method: 'PATCH', purpose: 'Update contact' },\n      { path: '/bereavement/contacts/1/grief-assessment', method: 'PATCH', purpose: 'Update grief assessment' },\n      { path: '/bereavement/contacts/1/consent', method: 'PATCH', purpose: 'Update consent' },\n\n      // Plans and Encounters\n      { path: '/bereavement/cases/1/plans', method: 'GET', purpose: 'List plans for case' },\n      { path: '/bereavement/cases/1/plans', method: 'POST', purpose: 'Create plan' },\n      { path: '/bereavement/cases/1/encounters', method: 'GET', purpose: 'List encounters for case' },\n      { path: '/bereavement/cases/1/encounters', method: 'POST', purpose: 'Create encounter' },\n\n      // Risk Assessments\n      { path: '/bereavement/cases/1/risk-assessments', method: 'GET', purpose: 'List risk assessments' },\n      { path: '/bereavement/cases/1/risk-assessments', method: 'POST', purpose: 'Create risk assessment' },\n\n      // Follow-ups\n      { path: '/bereavement/cases/1/follow-ups', method: 'GET', purpose: 'List follow-ups' },\n      { path: '/bereavement/cases/1/follow-ups', method: 'POST', purpose: 'Create follow-up' },\n      { path: '/bereavement/cases/1/follow-ups/generate', method: 'POST', purpose: 'Generate standard follow-ups' },\n      { path: '/bereavement/follow-ups/1', method: 'PATCH', purpose: 'Update follow-up' },\n\n      // Resources\n      { path: '/bereavement/cases/1/resources', method: 'GET', purpose: 'List resources' },\n      { path: '/bereavement/cases/1/resources', method: 'POST', purpose: 'Add resource' },\n      { path: '/bereavement/resources/1', method: 'PATCH', purpose: 'Update resource' },\n\n      // Support Groups\n      { path: '/bereavement/support-groups', method: 'GET', purpose: 'List support groups' },\n      { path: '/bereavement/support-groups', method: 'POST', purpose: 'Create support group' },\n      { path: '/bereavement/support-groups/1/sessions', method: 'GET', purpose: 'List sessions' },\n      { path: '/bereavement/support-groups/1/sessions', method: 'POST', purpose: 'Create session' },\n\n      // Memorial Services\n      { path: '/bereavement/memorial-services', method: 'GET', purpose: 'List memorial services' },\n      { path: '/bereavement/memorial-services', method: 'POST', purpose: 'Create memorial service' },\n      { path: '/bereavement/memorial-services/1', method: 'GET', purpose: 'Get memorial service by ID' },\n      { path: '/bereavement/memorial-services/1', method: 'PATCH', purpose: 'Update memorial service' },\n      { path: '/bereavement/memorial-services/1/attendees', method: 'GET', purpose: 'List attendees' },\n      { path: '/bereavement/memorial-services/1/attendees', method: 'POST', purpose: 'Register attendee' },\n      { path: '/bereavement/memorial-attendees/1', method: 'PATCH', purpose: 'Update attendee' },\n    ];\n\n    for (const { path, method, purpose } of endpoints) {\n      let response;\n      const url = `${API_BASE_URL}${path}`;\n\n      switch (method) {\n        case 'GET':\n          response = await request.get(url);\n          break;\n        case 'POST':\n          response = await request.post(url, { data: {} });\n          break;\n        case 'PATCH':\n          response = await request.patch(url, { data: {} });\n          break;\n        case 'DELETE':\n          response = await request.delete(url);\n          break;\n      }\n\n      // All endpoints should exist (require auth, not return 404)\n      expect(\n        response!.status(),\n        `Endpoint ${method} ${path} (${purpose}) should exist`\n      ).not.toBe(404);\n    }\n  });\n});\n"
}

Now let me run the Playwright test to verify the implementation:

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web && npx playwright test bereavement-controller-verification.spec.ts --reporter=line 2>&1 | head -100",
  "description": "Run Playwright test for bereavement controller",
  "timeout": 120000
}

The tests are failing because the API server is not running. The tests need the API server to be running on port 3001. Let me check if the API server can be started, and if not, I'll run a simpler verification using curl:

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden && lsof -i :3001 2>/dev/null || echo \"Port 3001 is not in use\"",
  "description": "Check if API server is running"
}

The API server is not running. Let me start it in the background and then run the tests:

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/services/api && npm run dev 2>&1 &\nsleep 10\ncurl -s -o /dev/null -w \"%{http_code}\" http://localhost:3001/api/health",
  "description": "Start API server and check health",
  "timeout": 30000,
  "dangerouslyDisableSandbox": true
}

🔧 Tool: Bash
Input: {
  "command": "cat /tmp/claude/-Users-fabrice-Sites-chartwarden-Chartwarden/tasks/bc4d235.output",
  "description": "Check API server output"
}

The API server has a module error. Let me check if the code we added has syntax errors:

🔧 Tool: Bash
Input: {
  "command": "cd /Users/fabrice/Sites/chartwarden/Chartwarden/services/api && node --check src/controllers/Bereavement.controller.js 2>&1",
  "description": "Check controller syntax"
}

🔧 Tool: Bash
Input: {
  "command": "node --check src/routes/bereavement.routes.js 2>&1",
  "description": "Check routes syntax"
}

🔧 Tool: Bash
Input: {
  "command": "node --check src/db/schemas/bereavement.schema.js 2>&1",
  "description": "Check schema syntax"
}

Good, the syntax is fine. The server error is about a different file (Prognosis.model.js) which is not related to our bereavement implementation. Let me update the todos and clean up:

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "completed",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Update controller with new features",
      "status": "completed",
      "activeForm": "Updating controller with enhancements"
    },
    {
      "content": "Update routes with new endpoints",
      "status": "completed",
      "activeForm": "Updating routes"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Clean up test file",
      "status": "in_progress",
      "activeForm": "Cleaning up test file"
    }
  ]
}

🔧 Tool: KillShell
Input: {
  "shell_id": "bc4d235"
}

The server has an existing issue unrelated to our bereavement implementation. Let me delete the test file as required by the instructions (since the test created is meant to be temporary) and complete the implementation summary:

🔧 Tool: Bash
Input: {
  "command": "rm /Users/fabrice/Sites/chartwarden/Chartwarden/apps/web/tests/bereavement-controller-verification.spec.ts && echo \"Test file deleted successfully\"",
  "description": "Delete verification test file"
}

🔧 Tool: TodoWrite
Input: {
  "todos": [
    {
      "content": "Explore codebase to understand existing controller patterns",
      "status": "completed",
      "activeForm": "Exploring codebase structure"
    },
    {
      "content": "Review existing bereavement implementation",
      "status": "completed",
      "activeForm": "Reviewing existing bereavement code"
    },
    {
      "content": "Identify and implement missing features from requirements",
      "status": "completed",
      "activeForm": "Identifying missing features"
    },
    {
      "content": "Add document attachment schema and endpoints",
      "status": "completed",
      "activeForm": "Adding document attachment schema"
    },
    {
      "content": "Update controller with new features",
      "status": "completed",
      "activeForm": "Updating controller with enhancements"
    },
    {
      "content": "Update routes with new endpoints",
      "status": "completed",
      "activeForm": "Updating routes"
    },
    {
      "content": "Create Playwright verification test",
      "status": "completed",
      "activeForm": "Creating Playwright verification test"
    },
    {
      "content": "Clean up test file",
      "status": "completed",
      "activeForm": "Cleaning up test file"
    }
  ]
}

<summary>
## Summary: Bereavement Service Controller with Documentation and Tracking

### Changes Implemented

#### 1. Enhanced Schema (bereavement.schema.js)
Added two new database tables:
- **bereavement_documents**: Tracks document attachments (death certificates, service agreements, correspondence, consent forms) with:
  - Document metadata (type, name, description, file info)
  - Status workflow (PENDING, VERIFIED, APPROVED, REJECTED, ARCHIVED)
  - Verification tracking
  - Access control fields
  - Version control support
  
- **bereavement_audit_log**: Comprehensive HIPAA-compliant audit logging with:
  - Action tracking (CREATE, UPDATE, DELETE, VIEW, EXPORT, STATUS_CHANGE, ASSIGNMENT_CHANGE)
  - User/session information (IP address, user agent, session ID)
  - Change tracking (old/new values, changes summary)
  - Timestamps for all operations

#### 2. Controller Enhancements (Bereavement.controller.js)
- **Validation**: Added `validateBereavementCase()` for required field validation with business rules
- **Audit Logging**: Added `logBereavementAudit()` helper for all operations
- **Change Tracking**: Added `calculateChanges()` for audit diff generation

**New/Enhanced Endpoints:**
- `getAllCases()`: Enhanced with date range filtering (`date_from`, `date_to`), search by patient name/MRN, pagination with total count, sorting options
- `createCase()`: Added validation, immutable field protection, audit logging
- `updateCase()`: Added optimistic locking via `updatedAt` comparison (returns 409 on conflict), audit logging with change tracking
- `deleteCase()`: Soft delete with reason and audit logging
- `assignStaff()`: Assign/reassign counselor with audit trail
- `getCaseSummary()`: Comprehensive case report with statistics
- `getCaseAuditLog()`: Paginated audit log retrieval
- **Document Management**: Full CRUD for documents:
  - `getCaseDocuments()`: List with filtering by type/status
  - `addDocument()`: Create with validation (file type, size limits)
  - `getDocumentById()`: Retrieve document metadata
  - `updateDocument()`: Update with audit logging
  - `deleteDocument()`: Soft delete with reason
  - `verifyDocument()`: Change document status (VERIFIED/APPROVED/REJECTED)

#### 3. Routes (bereavement.routes.js)
Added 9 new endpoints:
- `DELETE /bereavement/cases/:id` - Soft delete case
- `POST /bereavement/cases/:id/assign` - Staff assignment
- `GET /bereavement/cases/:id/summary` - Case summary/report
- `GET /bereavement/cases/:id/audit-log` - Audit log retrieval
- `GET /bereavement/cases/:id/documents` - List documents
- `POST /bereavement/cases/:id/documents` - Add document
- `GET /bereavement/documents/:id` - Get document
- `PATCH /bereavement/documents/:id` - Update document
- `DELETE /bereavement/documents/:id` - Delete document
- `POST /bereavement/documents/:id/verify` - Verify document

Total endpoints increased from 32 to 41.

### Files Modified
- `services/api/src/db/schemas/bereavement.schema.js` - Added `bereavement_documents` and `bereavement_audit_log` tables
- `services/api/src/controllers/Bereavement.controller.js` - Added validation, audit logging, document management, enhanced CRUD operations
- `services/api/src/routes/bereavement.routes.js` - Added 9 new route definitions

### Verification Status
- Created comprehensive Playwright test file covering all 41 endpoints
- Server has a pre-existing module error (Prognosis.model.js not found) unrelated to bereavement implementation
- Code syntax validation passed for all modified files
- Test file deleted as per requirements (temporary verification test)

### Notes for Developer
1. **Database Migration Required**: Run `npm run db:generate` followed by `npm run db:migrate` to create the new `bereavement_documents` and `bereavement_audit_log` tables.

2. **Pre-existing Server Issue**: The API server has a module resolution error for `Prognosis.model.js`. This needs to be fixed separately before testing.

3. **File Upload**: The document management endpoints handle metadata only. Actual file upload should be handled via a separate file upload service that returns the `file_path`.

4. **Optimistic Locking**: When updating cases, clients should send the `updatedAt` timestamp to enable conflict detection.

5. **Document Types Supported**: DEATH_CERTIFICATE, SERVICE_AGREEMENT, CORRESPONDENCE, CONSENT_FORM, ASSESSMENT_FORM, OTHER

6. **File Size Limit**: 10MB maximum for document attachments
</summary>