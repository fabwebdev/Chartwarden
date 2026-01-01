import { pgTable, bigint, varchar, timestamp, boolean, index, text, integer, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Patient Payers - Insurance payer information per patient
 * Manages insurance policies with policy numbers, group numbers, and payer details
 *
 * COMPLIANCE: Required for HIPAA, Medicare/Medicaid billing, and claim submission
 *
 * Payer types:
 * - MEDICARE: Medicare Part A/B (hospice benefit)
 * - MEDICAID: State Medicaid programs (dual-eligible)
 * - COMMERCIAL: Private/commercial insurance
 * - MANAGED_CARE: HMO/PPO/managed care plans
 * - TRICARE: Military healthcare
 * - CHAMPVA: Veterans Affairs civilian program
 * - WORKERS_COMP: Workers compensation
 * - AUTO: Automobile insurance (injury claims)
 * - SELF_PAY: Private pay/no insurance
 * - OTHER: Other payer types
 *
 * Use cases:
 * - Track primary, secondary, tertiary payers for coordination of benefits
 * - Store policy and group numbers for claim submission
 * - Manage effective dates for eligibility verification
 * - Support multi-payer scenarios common in hospice care
 * - Track authorization/pre-certification information
 */
export const patient_payers = pgTable('patient_payers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Payer classification
  payer_type: varchar('payer_type', { length: 50 }).notNull(), // MEDICARE, MEDICAID, COMMERCIAL, etc.
  payer_order: integer('payer_order').default(1).notNull(), // 1=Primary, 2=Secondary, 3=Tertiary

  // Payer identification
  payer_name: varchar('payer_name', { length: 255 }).notNull(), // Insurance company name
  payer_id: varchar('payer_id', { length: 100 }), // Payer ID for EDI submissions (e.g., CMS payer ID)
  payer_phone: varchar('payer_phone', { length: 50 }),
  payer_fax: varchar('payer_fax', { length: 50 }),
  payer_email: varchar('payer_email', { length: 255 }),
  payer_website: varchar('payer_website', { length: 255 }),

  // Payer address
  payer_address_line1: varchar('payer_address_line1', { length: 255 }),
  payer_address_line2: varchar('payer_address_line2', { length: 255 }),
  payer_city: varchar('payer_city', { length: 100 }),
  payer_state: varchar('payer_state', { length: 2 }), // Two-letter state code
  payer_zip: varchar('payer_zip', { length: 20 }),
  payer_country: varchar('payer_country', { length: 50 }).default('USA'),

  // Policy information
  policy_number: varchar('policy_number', { length: 100 }), // Member/subscriber ID
  group_number: varchar('group_number', { length: 100 }), // Group/employer ID
  group_name: varchar('group_name', { length: 255 }), // Employer/group name
  plan_name: varchar('plan_name', { length: 255 }), // Specific plan name
  plan_type: varchar('plan_type', { length: 100 }), // HMO, PPO, EPO, POS, etc.

  // Subscriber information (policy holder)
  subscriber_id: varchar('subscriber_id', { length: 100 }), // Subscriber ID if different from patient
  subscriber_name: varchar('subscriber_name', { length: 255 }), // Subscriber name
  subscriber_dob: date('subscriber_dob'), // Subscriber date of birth
  subscriber_relationship: varchar('subscriber_relationship', { length: 50 }), // SELF, SPOUSE, CHILD, OTHER
  subscriber_ssn: varchar('subscriber_ssn', { length: 20 }), // Subscriber SSN (last 4 or encrypted)

  // Medicare-specific fields
  medicare_beneficiary_id: varchar('medicare_beneficiary_id', { length: 50 }), // MBI (11-character)
  medicare_part_a_effective: date('medicare_part_a_effective'),
  medicare_part_b_effective: date('medicare_part_b_effective'),
  medicare_hospice_election_date: date('medicare_hospice_election_date'),
  medicare_advantage_plan: boolean('medicare_advantage_plan').default(false),
  medicare_advantage_plan_name: varchar('medicare_advantage_plan_name', { length: 255 }),

  // Medicaid-specific fields
  medicaid_id: varchar('medicaid_id', { length: 50 }),
  medicaid_state: varchar('medicaid_state', { length: 2 }), // State issuing Medicaid
  medicaid_plan_name: varchar('medicaid_plan_name', { length: 255 }),
  is_dual_eligible: boolean('is_dual_eligible').default(false), // Medicare + Medicaid

  // Coverage dates
  effective_date: date('effective_date'), // Coverage start date
  termination_date: date('termination_date'), // Coverage end date

  // Authorization/Pre-certification
  authorization_number: varchar('authorization_number', { length: 100 }),
  authorization_start_date: date('authorization_start_date'),
  authorization_end_date: date('authorization_end_date'),
  authorization_units: integer('authorization_units'), // Authorized days/visits
  authorization_notes: text('authorization_notes'),

  // Coordination of benefits
  cob_order: integer('cob_order'), // Coordination of benefits order
  accepts_assignment: boolean('accepts_assignment').default(true), // Provider accepts payment
  assignment_of_benefits: boolean('assignment_of_benefits').default(true), // Patient assigns benefits to provider

  // Eligibility verification
  is_verified: boolean('is_verified').default(false),
  verified_at: timestamp('verified_at'),
  verified_by_id: text('verified_by_id').references(() => users.id),
  verification_method: varchar('verification_method', { length: 100 }), // EDI 270/271, Portal, Phone
  verification_response: text('verification_response'), // Raw verification response
  last_eligibility_check: timestamp('last_eligibility_check'),
  eligibility_status: varchar('eligibility_status', { length: 50 }), // ACTIVE, INACTIVE, PENDING, UNKNOWN

  // Status flags
  is_active: boolean('is_active').default(true),
  is_primary: boolean('is_primary').default(false), // Primary payer for this patient

  // Notes and documentation
  notes: text('notes'),
  internal_notes: text('internal_notes'), // Staff-only notes

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Single column indexes for common lookups
  patientIdx: index('idx_patient_payers_patient_id').on(table.patient_id),
  payerTypeIdx: index('idx_patient_payers_payer_type').on(table.payer_type),
  payerNameIdx: index('idx_patient_payers_payer_name').on(table.payer_name),
  policyNumberIdx: index('idx_patient_payers_policy_number').on(table.policy_number),
  activeIdx: index('idx_patient_payers_is_active').on(table.is_active),
  primaryIdx: index('idx_patient_payers_is_primary').on(table.is_primary),

  // Composite indexes for common query patterns
  patientActiveIdx: index('idx_patient_payers_patient_active')
    .on(table.patient_id, table.is_active),
  patientOrderIdx: index('idx_patient_payers_patient_order')
    .on(table.patient_id, table.payer_order),
  patientPrimaryIdx: index('idx_patient_payers_patient_primary')
    .on(table.patient_id, table.is_primary),
  payerIdIdx: index('idx_patient_payers_payer_id')
    .on(table.payer_id),
  medicareIdIdx: index('idx_patient_payers_medicare_id')
    .on(table.medicare_beneficiary_id),
  medicaidIdIdx: index('idx_patient_payers_medicaid_id')
    .on(table.medicaid_id),
}));

// Alias export for consistency
export const patientPayers = patient_payers;
