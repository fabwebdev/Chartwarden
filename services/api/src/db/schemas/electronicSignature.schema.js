import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, index, pgEnum, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { sessions } from './session.schema.js';

// ============================================================================
// ELECTRONIC SIGNATURE SCHEMA - 21 CFR Part 11 COMPLIANCE
// ============================================================================
// Implements FDA 21 CFR Part 11 requirements for electronic records and signatures:
// - Unique user identification and authentication binding
// - Cryptographic timestamping for non-repudiation
// - Immutable records (no UPDATE/DELETE allowed via database triggers)
// - Signature meaning/intent documentation
// - Document version binding for integrity verification
// - Complete audit trail linkage
// ============================================================================

/**
 * Signature Type Enum
 * Defines the type of electronic signature captured
 */
export const signatureTypeEnum = pgEnum('signature_type', [
  'TYPED',        // User typed their name as signature
  'DRAWN',        // User drew signature on screen (touch/stylus)
  'BIOMETRIC',    // Fingerprint, retina, or other biometric
  'PIN',          // Personal Identification Number confirmation
  'SMART_CARD',   // Hardware token/smart card authentication
  'DIGITAL_CERT'  // PKI digital certificate signature
]);

/**
 * Signature Meaning/Intent Enum
 * Documents the legal significance and purpose of the signature
 * per 21 CFR Part 11.50(a) requirements
 */
export const signatureMeaningEnum = pgEnum('signature_meaning', [
  'AUTHOR',           // I created/wrote this document
  'REVIEWER',         // I have reviewed this document
  'APPROVER',         // I approve this document
  'VERIFIER',         // I verify the accuracy of this document
  'AUTHENTICATOR',    // I authenticate this document is genuine
  'WITNESS',          // I witnessed this event/signature
  'COSIGNER',         // I co-sign as supervisor/oversight
  'ORDERING_PROVIDER',// I am ordering this treatment/medication
  'CERTIFIER',        // I certify the information is true and accurate
  'ATTESTOR',         // I attest to the statements herein
  'RECIPIENT',        // I received/acknowledged this document
  'AMENDMENT'         // I am amending this document
]);

/**
 * Signature Status Enum
 * Tracks the lifecycle of a signature
 */
export const signatureStatusEnum = pgEnum('signature_status', [
  'VALID',            // Signature is valid and active
  'REVOKED',          // Signature has been revoked (with reason documented)
  'EXPIRED',          // Signature validity period has expired
  'SUPERSEDED',       // Replaced by a newer signature (amendment)
  'PENDING_REVIEW'    // Awaiting cosigner/supervisor review
]);

/**
 * Electronic Signatures Table
 *
 * 21 CFR Part 11 Compliance Features:
 * - 11.10(a): System validation controls
 * - 11.10(b): Ability to generate accurate copies
 * - 11.10(c): Protection of records for retention period
 * - 11.10(d): Limiting system access to authorized individuals
 * - 11.10(e): Secure, computer-generated, time-stamped audit trails
 * - 11.50(a): Signed electronic records contain signer info, date/time, meaning
 * - 11.50(b): Signature manifestation in human readable form
 * - 11.70: Linking of electronic signatures to electronic records
 * - 11.100: Signature uniqueness and verification
 * - 11.200: Electronic signature components and controls
 *
 * HIPAA Compliance:
 * - Linked to audit_logs for complete activity tracking
 * - User authentication verified at time of signature
 * - Session binding ensures proper access controls
 */
export const electronic_signatures = pgTable('electronic_signatures', {
  // Primary key - auto-incrementing for sequential ordering
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // ============================================================================
  // SIGNER IDENTIFICATION (21 CFR Part 11.100)
  // ============================================================================

  // User who created the signature - REQUIRED
  signer_id: text('signer_id')
    .references(() => users.id, { onDelete: 'restrict', onUpdate: 'cascade' })
    .notNull(),

  // Denormalized signer info for immutable record (captured at time of signing)
  signer_name: varchar('signer_name', { length: 255 }).notNull(),
  signer_email: varchar('signer_email', { length: 255 }).notNull(),
  signer_credentials: varchar('signer_credentials', { length: 255 }), // MD, RN, LCSW, etc.
  signer_title: varchar('signer_title', { length: 255 }), // Job title at time of signing

  // Session binding - proves user was authenticated (21 CFR Part 11.200)
  session_id: text('session_id')
    .references(() => sessions.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // ============================================================================
  // SIGNATURE DATA (21 CFR Part 11.50)
  // ============================================================================

  // Type of signature captured
  signature_type: signatureTypeEnum('signature_type').notNull(),

  // Signature meaning/intent - REQUIRED per 21 CFR 11.50(a)
  signature_meaning: signatureMeaningEnum('signature_meaning').notNull(),

  // Legal statement acknowledged by signer
  // e.g., "I certify that the information provided is true and accurate"
  signature_statement: text('signature_statement').notNull(),

  // Actual signature data (based on signature_type)
  // For TYPED: the typed name
  // For DRAWN: base64-encoded image data or SVG path data
  // For BIOMETRIC: encrypted biometric hash
  // For PIN: confirmation flag (never store actual PIN)
  // For SMART_CARD: token identifier
  // For DIGITAL_CERT: certificate thumbprint/serial
  signature_data: text('signature_data').notNull(),

  // For drawn signatures - additional metadata
  signature_image_format: varchar('signature_image_format', { length: 50 }), // PNG, SVG, etc.

  // ============================================================================
  // DOCUMENT BINDING (21 CFR Part 11.70)
  // ============================================================================

  // What type of record is being signed
  document_type: varchar('document_type', { length: 100 }).notNull(), // encounter, order, certification, etc.

  // ID of the record being signed
  document_id: text('document_id').notNull(),

  // Version of the document at time of signing (for amendment tracking)
  document_version: varchar('document_version', { length: 50 }).default('1.0').notNull(),

  // Cryptographic hash of document content at time of signing
  // SHA-256 hash of the document content - proves document wasn't altered after signing
  document_hash: varchar('document_hash', { length: 64 }).notNull(),

  // Hash algorithm used (for future-proofing if SHA-256 is deprecated)
  hash_algorithm: varchar('hash_algorithm', { length: 50 }).default('SHA-256').notNull(),

  // ============================================================================
  // TIMESTAMP & NON-REPUDIATION (21 CFR Part 11.10(e))
  // ============================================================================

  // Immutable timestamp of when signature was captured
  signed_at: timestamp('signed_at').notNull(),

  // Server timestamp (for comparison/validation)
  server_timestamp: timestamp('server_timestamp').defaultNow().notNull(),

  // Timezone of the signer at time of signing
  signer_timezone: varchar('signer_timezone', { length: 100 }),

  // Optional: Timestamp from trusted timestamp authority (TSA)
  // For higher assurance environments
  tsa_timestamp: timestamp('tsa_timestamp'),
  tsa_provider: varchar('tsa_provider', { length: 255 }),
  tsa_response: text('tsa_response'), // TSA token/response data

  // ============================================================================
  // AUTHENTICATION VERIFICATION (21 CFR Part 11.200)
  // ============================================================================

  // How the user authenticated before signing
  authentication_method: varchar('authentication_method', { length: 100 }).notNull(), // PASSWORD, MFA, BIOMETRIC, SSO

  // Was MFA used for this signature?
  mfa_verified: boolean('mfa_verified').default(false).notNull(),

  // Type of MFA used (if applicable)
  mfa_type: varchar('mfa_type', { length: 100 }), // TOTP, SMS, EMAIL, HARDWARE_KEY, PUSH

  // IP address of signer (for audit/verification)
  ip_address: varchar('ip_address', { length: 45 }), // IPv6 max length

  // User agent/device info
  user_agent: text('user_agent'),

  // Device fingerprint (optional, for additional verification)
  device_fingerprint: varchar('device_fingerprint', { length: 255 }),

  // ============================================================================
  // SIGNATURE STATUS & LIFECYCLE
  // ============================================================================

  // Current status of the signature
  status: signatureStatusEnum('status').default('VALID').notNull(),

  // If revoked or superseded, link to the reason/replacement
  superseded_by_id: bigint('superseded_by_id', { mode: 'number' }),
  revocation_reason: text('revocation_reason'),
  revoked_at: timestamp('revoked_at'),
  revoked_by_id: text('revoked_by_id')
    .references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // ============================================================================
  // COSIGNATURE REQUIREMENTS
  // ============================================================================

  // Does this signature require a cosigner?
  requires_cosigner: boolean('requires_cosigner').default(false).notNull(),

  // ID of the required cosigner (if specific person required)
  required_cosigner_id: text('required_cosigner_id')
    .references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Role/credential required for cosigner (if any qualified person can cosign)
  required_cosigner_role: varchar('required_cosigner_role', { length: 100 }),

  // Reference to cosigner's signature when completed
  cosigner_signature_id: bigint('cosigner_signature_id', { mode: 'number' }),

  // Deadline for cosignature (for time-sensitive documents)
  cosignature_deadline: timestamp('cosignature_deadline'),

  // ============================================================================
  // COMPLIANCE METADATA
  // ============================================================================

  // Link to audit log entry for this signature event
  audit_log_id: bigint('audit_log_id', { mode: 'number' }),

  // Organization/facility context
  organization_id: varchar('organization_id', { length: 100 }),
  facility_id: varchar('facility_id', { length: 100 }),

  // Regulatory context
  regulatory_context: varchar('regulatory_context', { length: 100 }), // FDA, HIPAA, STATE_BOARD, etc.

  // Additional metadata for extensibility
  metadata: jsonb('metadata'),

  // ============================================================================
  // RECORD TIMESTAMPS (Immutable - no updated_at)
  // ============================================================================

  // Creation timestamp - immutable record
  created_at: timestamp('created_at').defaultNow().notNull()

  // NOTE: No updated_at column - electronic signatures are IMMUTABLE
  // per 21 CFR Part 11 requirements. Any changes result in a new signature
  // with the old one marked as SUPERSEDED.

}, (table) => ({
  // ============================================================================
  // PERFORMANCE INDEXES
  // ============================================================================

  // Single column indexes for frequently queried columns
  signerIdx: index('idx_electronic_signatures_signer_id').on(table.signer_id),
  sessionIdx: index('idx_electronic_signatures_session_id').on(table.session_id),
  documentTypeIdx: index('idx_electronic_signatures_document_type').on(table.document_type),
  documentIdIdx: index('idx_electronic_signatures_document_id').on(table.document_id),
  statusIdx: index('idx_electronic_signatures_status').on(table.status),
  signedAtIdx: index('idx_electronic_signatures_signed_at').on(table.signed_at),
  meaningIdx: index('idx_electronic_signatures_meaning').on(table.signature_meaning),

  // Composite indexes for common query patterns

  // Document signature history - "get all signatures for encounter #123"
  documentHistoryIdx: index('idx_electronic_signatures_document_history')
    .on(table.document_type, table.document_id, table.signed_at),

  // User signature history - "show all signatures by user in time range"
  signerTimeIdx: index('idx_electronic_signatures_signer_time')
    .on(table.signer_id, table.signed_at),

  // Pending cosignatures - "find documents awaiting cosignature"
  pendingCosignIdx: index('idx_electronic_signatures_pending_cosign')
    .on(table.requires_cosigner, table.cosigner_signature_id, table.cosignature_deadline),

  // Status queries - "find all valid signatures for document"
  documentStatusIdx: index('idx_electronic_signatures_document_status')
    .on(table.document_type, table.document_id, table.status),

  // Unique constraint: prevent duplicate signatures for same document version by same user with same meaning
  uniqueSignature: unique('unique_signature_per_document_version')
    .on(table.signer_id, table.document_type, table.document_id, table.document_version, table.signature_meaning)
}));

/**
 * Signature Audit Events Table
 *
 * Detailed audit trail for all signature-related events
 * Complements the main audit_logs table with signature-specific details
 * Required for 21 CFR Part 11.10(e) - secure, computer-generated, time-stamped audit trails
 */
export const signature_audit_events = pgTable('signature_audit_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reference to the signature
  signature_id: bigint('signature_id', { mode: 'number' })
    .references(() => electronic_signatures.id, { onDelete: 'restrict', onUpdate: 'cascade' })
    .notNull(),

  // Event details
  event_type: varchar('event_type', { length: 100 }).notNull(), // CREATED, VIEWED, VERIFIED, REVOKED, EXPORTED, etc.
  event_description: text('event_description'),

  // Who triggered this event
  actor_id: text('actor_id')
    .references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  actor_name: varchar('actor_name', { length: 255 }),

  // Session context
  session_id: text('session_id')
    .references(() => sessions.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Request context
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),

  // Additional event data
  event_metadata: jsonb('event_metadata'),

  // Immutable timestamp
  created_at: timestamp('created_at').defaultNow().notNull()

  // NOTE: No updated_at - audit events are immutable
}, (table) => ({
  signatureIdx: index('idx_signature_audit_events_signature_id').on(table.signature_id),
  actorIdx: index('idx_signature_audit_events_actor_id').on(table.actor_id),
  eventTypeIdx: index('idx_signature_audit_events_event_type').on(table.event_type),
  createdAtIdx: index('idx_signature_audit_events_created_at').on(table.created_at),

  // Composite: signature event history
  signatureEventHistoryIdx: index('idx_signature_audit_events_history')
    .on(table.signature_id, table.created_at)
}));

/**
 * Signature Verification Tokens Table
 *
 * Secure tokens for external signature verification
 * Allows third parties to verify signature authenticity without system access
 */
export const signature_verification_tokens = pgTable('signature_verification_tokens', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reference to the signature
  signature_id: bigint('signature_id', { mode: 'number' })
    .references(() => electronic_signatures.id, { onDelete: 'cascade', onUpdate: 'cascade' })
    .notNull(),

  // Verification token (secure random string)
  token: varchar('token', { length: 255 }).notNull().unique(),

  // Token configuration
  expires_at: timestamp('expires_at'),
  max_uses: bigint('max_uses', { mode: 'number' }),
  use_count: bigint('use_count', { mode: 'number' }).default(0).notNull(),

  // Who created this token
  created_by_id: text('created_by_id')
    .references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Token status
  is_active: boolean('is_active').default(true).notNull(),
  revoked_at: timestamp('revoked_at'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tokenIdx: index('idx_signature_verification_tokens_token').on(table.token),
  signatureIdx: index('idx_signature_verification_tokens_signature_id').on(table.signature_id),
  activeIdx: index('idx_signature_verification_tokens_active').on(table.is_active, table.expires_at)
}));
