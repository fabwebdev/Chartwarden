import { db } from "../config/db.drizzle.js";
import { users } from "../db/schemas/user.schema.js";
import { roles } from "../db/schemas/role.schema.js";
import { permissions } from "../db/schemas/permission.schema.js";
import { role_has_permissions } from "../db/schemas/rolePermission.schema.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { logger } from '../utils/logger.js';

// Role definitions with hierarchy levels
const roleDefinitions = [
  { name: "admin", display_name: "Administrator", hierarchy_level: 1, is_system: true },
  { name: "doctor", display_name: "Doctor", hierarchy_level: 10, is_system: true },
  { name: "nurse", display_name: "Nurse", hierarchy_level: 20, is_system: true },
  { name: "staff", display_name: "Staff", hierarchy_level: 50, is_system: true },
  { name: "patient", display_name: "Patient", hierarchy_level: 100, is_system: true },
  { name: "user", display_name: "User", hierarchy_level: 100, is_system: false },
];

// Permission definitions with resource and action breakdown
const permissionDefinitions = [
  // Patient Management
  { name: "view:patient", resource: "patient", action: "view", description: "View patient records" },
  { name: "create:patient", resource: "patient", action: "create", description: "Create new patients" },
  { name: "update:patient", resource: "patient", action: "update", description: "Update patient information" },
  { name: "delete:patient", resource: "patient", action: "delete", description: "Delete patient records" },

  // Clinical Notes
  { name: "view:clinical_notes", resource: "clinical_notes", action: "view", description: "View clinical notes" },
  { name: "create:clinical_notes", resource: "clinical_notes", action: "create", description: "Create clinical notes" },
  { name: "update:clinical_notes", resource: "clinical_notes", action: "update", description: "Update clinical notes" },
  { name: "delete:clinical_notes", resource: "clinical_notes", action: "delete", description: "Delete clinical notes" },

  // Vital Signs
  { name: "view:vital_signs", resource: "vital_signs", action: "view", description: "View vital signs" },
  { name: "create:vital_signs", resource: "vital_signs", action: "create", description: "Record vital signs" },
  { name: "update:vital_signs", resource: "vital_signs", action: "update", description: "Update vital signs" },
  { name: "delete:vital_signs", resource: "vital_signs", action: "delete", description: "Delete vital signs" },

  // Medications
  { name: "view:medications", resource: "medications", action: "view", description: "View medications" },
  { name: "create:medications", resource: "medications", action: "create", description: "Prescribe medications" },
  { name: "update:medications", resource: "medications", action: "update", description: "Update medications" },
  { name: "delete:medications", resource: "medications", action: "delete", description: "Remove medications" },

  // Reports
  { name: "view:reports", resource: "reports", action: "view", description: "View reports" },
  { name: "generate:reports", resource: "reports", action: "generate", description: "Generate reports" },

  // User Management (Admin)
  { name: "manage:users", resource: "users", action: "manage", description: "Manage user accounts" },
  { name: "manage:roles", resource: "roles", action: "manage", description: "Manage roles" },
  { name: "manage:permissions", resource: "permissions", action: "manage", description: "Manage permissions" },
  { name: "view:audit_logs", resource: "audit_logs", action: "view", description: "View audit logs" },
];

// Role-permission mappings (which permissions each role has)
const rolePermissionMappings = {
  admin: [
    "view:patient", "create:patient", "update:patient", "delete:patient",
    "view:clinical_notes", "create:clinical_notes", "update:clinical_notes", "delete:clinical_notes",
    "view:vital_signs", "create:vital_signs", "update:vital_signs", "delete:vital_signs",
    "view:medications", "create:medications", "update:medications", "delete:medications",
    "view:reports", "generate:reports",
    "manage:users", "manage:roles", "manage:permissions", "view:audit_logs",
  ],
  doctor: [
    "view:patient", "create:patient", "update:patient",
    "view:clinical_notes", "create:clinical_notes", "update:clinical_notes",
    "view:vital_signs", "create:vital_signs", "update:vital_signs",
    "view:medications", "create:medications", "update:medications",
    "view:reports", "generate:reports",
  ],
  nurse: [
    "view:patient", "update:patient",
    "view:clinical_notes", "create:clinical_notes", "update:clinical_notes",
    "view:vital_signs", "create:vital_signs", "update:vital_signs",
    "view:medications",
  ],
  staff: [
    "view:patient",
    "view:clinical_notes",
    "view:vital_signs",
    "view:medications",
  ],
  patient: [
    "view:patient",
  ],
  user: [
    "view:patient",
  ],
};

const seedDatabase = async () => {
  try {
    logger.info("Database connection has been established successfully.")

    // Create default roles with full definition
    for (const role of roleDefinitions) {
      await db.execute(sql`
        INSERT INTO roles (name, display_name, hierarchy_level, is_system, guard_name, created_at, updated_at)
        VALUES (${role.name}, ${role.display_name}, ${role.hierarchy_level}, ${role.is_system}, 'web', NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          display_name = ${role.display_name},
          hierarchy_level = ${role.hierarchy_level},
          is_system = ${role.is_system},
          updated_at = NOW()
      `);
    }

    logger.info("Roles seeded successfully.")

    // Create default permissions with resource and action
    for (const perm of permissionDefinitions) {
      await db.execute(sql`
        INSERT INTO permissions (name, resource, action, description, guard_name, created_at, updated_at)
        VALUES (${perm.name}, ${perm.resource}, ${perm.action}, ${perm.description}, 'web', NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET
          resource = ${perm.resource},
          action = ${perm.action},
          description = ${perm.description},
          updated_at = NOW()
      `);
    }

    logger.info("Permissions seeded successfully.")

    // Create role-permission associations
    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
      // Get role ID
      const roleResult = await db.execute(sql`SELECT id FROM roles WHERE name = ${roleName}`);
      if (roleResult.rows.length === 0) continue;
      const roleId = parseInt(roleResult.rows[0].id);

      for (const permName of permissionNames) {
        // Get permission ID
        const permResult = await db.execute(sql`SELECT id FROM permissions WHERE name = ${permName}`);
        if (permResult.rows.length === 0) continue;
        const permId = parseInt(permResult.rows[0].id);

        // Insert role-permission association
        await db.execute(sql`
          INSERT INTO role_has_permissions (role_id, permission_id, assigned_at)
          VALUES (${roleId}, ${permId}, NOW())
          ON CONFLICT (role_id, permission_id) DO NOTHING
        `);
      }
    }

    logger.info("Role-permission associations seeded successfully.")

    // Create admin user if not exists
    const existingUsers = await db.execute(sql`
            SELECT * FROM ${users} WHERE email = 'admin@example.com'
        `);

    if (existingUsers.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("password", 10);
      const userId = nanoid(); // Generate a unique ID for the user

      const newUser = await db.execute(sql`
                INSERT INTO ${users} (id, name, email, password, "createdAt", "updatedAt")
                VALUES (${userId}, 'Admin User', 'admin@example.com', ${hashedPassword}, NOW(), NOW())
                RETURNING id
            `);

      // Get admin role id
      const adminRole = await db.execute(sql`
                SELECT id FROM ${roles} WHERE name = 'admin'
            `);

      if (adminRole.rows.length > 0) {
        const roleId = parseInt(adminRole.rows[0].id); // Convert to integer

        // Assign admin role to admin user using user_has_roles table
        await db.execute(sql`
                    INSERT INTO user_has_roles (user_id, role_id)
                    VALUES (${userId}, ${roleId})
                `);

        logger.info("Admin user created and assigned admin role.")
      } else {
        logger.info("Admin role not found, skipping role assignment.")
      }
    } else {
      logger.info("Admin user already exists.")
    }

    logger.info("Database seeding completed successfully.")
  } catch (error) {
    logger.error("Error seeding database:", error)
  }
};

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}

export default seedDatabase;
