import { db } from '../config/db.drizzle.js';
import {
  electronic_signatures,
  signature_audit_events,
  signature_verification_tokens
} from '../db/schemas/index.js';
import { users } from '../db/schemas/user.schema.js';
import { eq, and, desc, gte, lte, isNull, or, sql } from 'drizzle-orm';
import crypto from 'crypto';
import AuditService from '../services/AuditService.js';
import { logger } from '../utils/logger.js';

/**
 * Electronic Signature Controller
 *
 * Implements 21 CFR Part 11 compliant electronic signature operations:
 * - Unique user identification and authentication binding
 * - Cryptographic document hashing for integrity verification
 * - Immutable signature records with complete audit trail
 * - Signature meaning/intent documentation
 * - Cosignature workflow support
 * - Signature verification and revocation
 *
 * HIPAA Compliance:
 * - All signature operations are logged to audit trail
 * - PHI is never stored in signature data
 * - Session binding ensures proper authentication
 */
class ElectronicSignatureController {
  /**
   * Create a new electronic signature
   * POST /electronic-signatures
   *
   * 21 CFR Part 11 Requirements Met:
   * - 11.50(a): Signed records contain signer info, date/time, and meaning
   * - 11.70: Signatures linked to records via document_hash
   * - 11.100: Unique user identification verified through session
   * - 11.200: Electronic signature components captured
   */
  async create(request, reply) {
    try {
      const {
        document_type,
        document_id,
        document_content, // Content to hash (not stored)
        document_version = '1.0',
        signature_type,
        signature_meaning,
        signature_statement,
        signature_data,
        signature_image_format,
        requires_cosigner = false,
        required_cosigner_id,
        required_cosigner_role,
        cosignature_deadline,
        regulatory_context,
        metadata = {}
      } = request.body;

      // Validate required fields
      if (!document_type || !document_id || !signature_type || !signature_meaning || !signature_statement || !signature_data) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: document_type, document_id, signature_type, signature_meaning, signature_statement, signature_data'
        };
      }

      // Validate signature type
      const validSignatureTypes = ['TYPED', 'DRAWN', 'BIOMETRIC', 'PIN', 'SMART_CARD', 'DIGITAL_CERT'];
      if (!validSignatureTypes.includes(signature_type)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid signature_type. Must be one of: ${validSignatureTypes.join(', ')}`
        };
      }

      // Validate signature meaning
      const validMeanings = ['AUTHOR', 'REVIEWER', 'APPROVER', 'VERIFIER', 'AUTHENTICATOR', 'WITNESS', 'COSIGNER', 'ORDERING_PROVIDER', 'CERTIFIER', 'ATTESTOR', 'RECIPIENT', 'AMENDMENT'];
      if (!validMeanings.includes(signature_meaning)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid signature_meaning. Must be one of: ${validMeanings.join(', ')}`
        };
      }

      // Get user information
      const user = request.user;
      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required for electronic signatures'
        };
      }

      // Generate document hash for integrity verification
      const contentToHash = document_content || JSON.stringify({ document_type, document_id, document_version });
      const documentHash = crypto.createHash('sha256').update(contentToHash).digest('hex');

      // Get current timestamp
      const signedAt = new Date();

      // Prepare signature record
      const signatureRecord = {
        // Signer identification
        signer_id: user.id,
        signer_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        signer_email: user.email,
        signer_credentials: user.credentials || user.role || null,
        signer_title: user.title || null,
        session_id: request.session?.id || null,

        // Signature data
        signature_type,
        signature_meaning,
        signature_statement,
        signature_data,
        signature_image_format: signature_type === 'DRAWN' ? signature_image_format : null,

        // Document binding
        document_type,
        document_id: String(document_id),
        document_version,
        document_hash: documentHash,
        hash_algorithm: 'SHA-256',

        // Timestamp
        signed_at: signedAt,
        server_timestamp: signedAt,
        signer_timezone: request.headers['x-timezone'] || Intl.DateTimeFormat().resolvedOptions().timeZone,

        // Authentication verification
        authentication_method: user.mfaVerified ? 'MFA' : 'PASSWORD',
        mfa_verified: user.mfaVerified || false,
        mfa_type: user.mfaType || null,
        ip_address: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || null,
        user_agent: request.headers['user-agent'] || null,
        device_fingerprint: request.headers['x-device-fingerprint'] || null,

        // Status
        status: requires_cosigner ? 'PENDING_REVIEW' : 'VALID',

        // Cosignature requirements
        requires_cosigner,
        required_cosigner_id: required_cosigner_id || null,
        required_cosigner_role: required_cosigner_role || null,
        cosignature_deadline: cosignature_deadline ? new Date(cosignature_deadline) : null,

        // Compliance metadata
        organization_id: user.organizationId || null,
        facility_id: user.facilityId || null,
        regulatory_context: regulatory_context || 'HIPAA',
        metadata: { ...metadata, userAgent: request.headers['user-agent'] }
      };

      // Insert signature record
      const result = await db
        .insert(electronic_signatures)
        .values(signatureRecord)
        .returning();

      const createdSignature = result[0];

      // Create audit event for signature creation
      await db.insert(signature_audit_events).values({
        signature_id: createdSignature.id,
        event_type: 'CREATED',
        event_description: `Electronic signature created for ${document_type} ${document_id}`,
        actor_id: user.id,
        actor_name: signatureRecord.signer_name,
        session_id: signatureRecord.session_id,
        ip_address: signatureRecord.ip_address,
        user_agent: signatureRecord.user_agent,
        event_metadata: {
          document_type,
          document_id,
          signature_meaning,
          requires_cosigner
        }
      });

      // Log to main audit system
      await AuditService.createAuditLog({
        user_id: user.id,
        action: 'SIGNATURE_CREATE',
        resource_type: 'electronic_signature',
        resource_id: String(createdSignature.id),
        ip_address: signatureRecord.ip_address,
        user_agent: signatureRecord.user_agent,
        status: 'success',
        metadata: JSON.stringify({
          document_type,
          document_id,
          signature_meaning
        })
      }, {}, { immediate: true });

      reply.code(201);
      return {
        status: 201,
        message: 'Electronic signature created successfully',
        data: {
          id: createdSignature.id,
          signer_name: createdSignature.signer_name,
          signature_meaning: createdSignature.signature_meaning,
          document_type: createdSignature.document_type,
          document_id: createdSignature.document_id,
          document_hash: createdSignature.document_hash,
          signed_at: createdSignature.signed_at,
          status: createdSignature.status,
          requires_cosigner: createdSignature.requires_cosigner
        }
      };
    } catch (error) {
      logger.error('Error creating electronic signature:', error);

      // Check for unique constraint violation
      if (error.code === '23505') {
        reply.code(409);
        return {
          status: 409,
          message: 'A signature with this meaning already exists for this document version'
        };
      }

      reply.code(500);
      return {
        status: 500,
        message: 'Error creating electronic signature',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get electronic signature by ID
   * GET /electronic-signatures/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;
      const user = request.user;

      const result = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Electronic signature not found'
        };
      }

      // Log signature view to audit trail
      await db.insert(signature_audit_events).values({
        signature_id: parseInt(id),
        event_type: 'VIEWED',
        event_description: `Signature viewed by ${user?.email || 'unknown'}`,
        actor_id: user?.id || null,
        actor_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      });

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching electronic signature:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching electronic signature',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get signatures for a document
   * GET /electronic-signatures/document/:documentType/:documentId
   */
  async getByDocument(request, reply) {
    try {
      const { documentType, documentId } = request.params;
      const { status, meaning, include_superseded = 'false' } = request.query;

      let conditions = [
        eq(electronic_signatures.document_type, documentType),
        eq(electronic_signatures.document_id, String(documentId))
      ];

      // Exclude superseded signatures by default
      if (include_superseded !== 'true') {
        conditions.push(
          or(
            eq(electronic_signatures.status, 'VALID'),
            eq(electronic_signatures.status, 'PENDING_REVIEW')
          )
        );
      }

      if (status) {
        conditions.push(eq(electronic_signatures.status, status));
      }

      if (meaning) {
        conditions.push(eq(electronic_signatures.signature_meaning, meaning));
      }

      const results = await db
        .select()
        .from(electronic_signatures)
        .where(and(...conditions))
        .orderBy(desc(electronic_signatures.signed_at));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching document signatures:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching document signatures',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Verify signature integrity
   * POST /electronic-signatures/:id/verify
   *
   * Verifies that the document content matches the stored hash
   */
  async verify(request, reply) {
    try {
      const { id } = request.params;
      const { document_content } = request.body;
      const user = request.user;

      if (!document_content) {
        reply.code(400);
        return {
          status: 400,
          message: 'document_content is required for verification'
        };
      }

      const result = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Electronic signature not found'
        };
      }

      const signature = result[0];

      // Calculate hash of provided content
      const calculatedHash = crypto.createHash('sha256').update(document_content).digest('hex');
      const isValid = calculatedHash === signature.document_hash;

      // Log verification attempt
      await db.insert(signature_audit_events).values({
        signature_id: parseInt(id),
        event_type: 'VERIFIED',
        event_description: `Signature verification ${isValid ? 'successful' : 'failed'}`,
        actor_id: user?.id || null,
        actor_name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        event_metadata: {
          verification_result: isValid,
          hash_algorithm: signature.hash_algorithm
        }
      });

      reply.code(200);
      return {
        status: 200,
        data: {
          signature_id: signature.id,
          is_valid: isValid,
          signature_status: signature.status,
          hash_algorithm: signature.hash_algorithm,
          signed_at: signature.signed_at,
          signer_name: signature.signer_name,
          signer_credentials: signature.signer_credentials,
          verification_timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error verifying signature:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error verifying signature',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Cosign a signature
   * POST /electronic-signatures/:id/cosign
   *
   * Creates a new cosignature linked to the original signature
   */
  async cosign(request, reply) {
    try {
      const { id } = request.params;
      const {
        signature_type,
        signature_statement,
        signature_data,
        signature_image_format,
        metadata = {}
      } = request.body;

      const user = request.user;
      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required for cosigning'
        };
      }

      // Get original signature
      const originalResult = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!originalResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Original signature not found'
        };
      }

      const originalSignature = originalResult[0];

      // Validate cosignature is required
      if (!originalSignature.requires_cosigner) {
        reply.code(400);
        return {
          status: 400,
          message: 'This signature does not require a cosigner'
        };
      }

      // Validate cosignature not already completed
      if (originalSignature.cosigner_signature_id) {
        reply.code(400);
        return {
          status: 400,
          message: 'This signature has already been cosigned'
        };
      }

      // Validate cosigner authorization
      if (originalSignature.required_cosigner_id && originalSignature.required_cosigner_id !== user.id) {
        reply.code(403);
        return {
          status: 403,
          message: 'You are not authorized to cosign this document'
        };
      }

      if (originalSignature.required_cosigner_role && user.role !== originalSignature.required_cosigner_role) {
        reply.code(403);
        return {
          status: 403,
          message: `Cosigner must have role: ${originalSignature.required_cosigner_role}`
        };
      }

      // Check deadline
      if (originalSignature.cosignature_deadline && new Date() > originalSignature.cosignature_deadline) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cosignature deadline has passed'
        };
      }

      // Create cosignature
      const signedAt = new Date();
      const cosignatureRecord = {
        signer_id: user.id,
        signer_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        signer_email: user.email,
        signer_credentials: user.credentials || user.role || null,
        signer_title: user.title || null,
        session_id: request.session?.id || null,

        signature_type: signature_type || 'TYPED',
        signature_meaning: 'COSIGNER',
        signature_statement: signature_statement || 'I have reviewed and approve this document as cosigner',
        signature_data,
        signature_image_format,

        document_type: originalSignature.document_type,
        document_id: originalSignature.document_id,
        document_version: originalSignature.document_version,
        document_hash: originalSignature.document_hash,
        hash_algorithm: originalSignature.hash_algorithm,

        signed_at: signedAt,
        server_timestamp: signedAt,
        signer_timezone: request.headers['x-timezone'] || Intl.DateTimeFormat().resolvedOptions().timeZone,

        authentication_method: user.mfaVerified ? 'MFA' : 'PASSWORD',
        mfa_verified: user.mfaVerified || false,
        mfa_type: user.mfaType || null,
        ip_address: request.ip || request.headers['x-forwarded-for']?.split(',')[0] || null,
        user_agent: request.headers['user-agent'] || null,

        status: 'VALID',
        requires_cosigner: false,

        organization_id: user.organizationId || null,
        facility_id: user.facilityId || null,
        regulatory_context: originalSignature.regulatory_context,
        metadata: { ...metadata, original_signature_id: originalSignature.id }
      };

      const cosignResult = await db
        .insert(electronic_signatures)
        .values(cosignatureRecord)
        .returning();

      const cosignature = cosignResult[0];

      // Update original signature with cosigner reference and set to VALID
      await db
        .update(electronic_signatures)
        .set({
          cosigner_signature_id: cosignature.id,
          status: 'VALID'
        })
        .where(eq(electronic_signatures.id, parseInt(id)));

      // Create audit events
      await db.insert(signature_audit_events).values([
        {
          signature_id: parseInt(id),
          event_type: 'COSIGNED',
          event_description: `Document cosigned by ${cosignatureRecord.signer_name}`,
          actor_id: user.id,
          actor_name: cosignatureRecord.signer_name,
          ip_address: cosignatureRecord.ip_address,
          user_agent: cosignatureRecord.user_agent,
          event_metadata: { cosigner_signature_id: cosignature.id }
        },
        {
          signature_id: cosignature.id,
          event_type: 'CREATED',
          event_description: `Cosignature created for ${originalSignature.document_type} ${originalSignature.document_id}`,
          actor_id: user.id,
          actor_name: cosignatureRecord.signer_name,
          ip_address: cosignatureRecord.ip_address,
          user_agent: cosignatureRecord.user_agent,
          event_metadata: { original_signature_id: originalSignature.id }
        }
      ]);

      // Log to main audit system
      await AuditService.createAuditLog({
        user_id: user.id,
        action: 'SIGNATURE_COSIGN',
        resource_type: 'electronic_signature',
        resource_id: String(id),
        ip_address: cosignatureRecord.ip_address,
        user_agent: cosignatureRecord.user_agent,
        status: 'success',
        metadata: JSON.stringify({
          original_signature_id: id,
          cosigner_signature_id: cosignature.id
        })
      }, {}, { immediate: true });

      reply.code(201);
      return {
        status: 201,
        message: 'Document cosigned successfully',
        data: {
          cosignature_id: cosignature.id,
          original_signature_id: originalSignature.id,
          cosigner_name: cosignature.signer_name,
          signed_at: cosignature.signed_at,
          status: 'VALID'
        }
      };
    } catch (error) {
      logger.error('Error cosigning document:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error cosigning document',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Revoke a signature
   * POST /electronic-signatures/:id/revoke
   *
   * Marks a signature as revoked (immutable - does not delete)
   */
  async revoke(request, reply) {
    try {
      const { id } = request.params;
      const { revocation_reason } = request.body;
      const user = request.user;

      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required'
        };
      }

      if (!revocation_reason) {
        reply.code(400);
        return {
          status: 400,
          message: 'revocation_reason is required'
        };
      }

      const result = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Electronic signature not found'
        };
      }

      const signature = result[0];

      if (signature.status === 'REVOKED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Signature is already revoked'
        };
      }

      // Revoke the signature
      await db
        .update(electronic_signatures)
        .set({
          status: 'REVOKED',
          revocation_reason,
          revoked_at: new Date(),
          revoked_by_id: user.id
        })
        .where(eq(electronic_signatures.id, parseInt(id)));

      // Create audit event
      await db.insert(signature_audit_events).values({
        signature_id: parseInt(id),
        event_type: 'REVOKED',
        event_description: `Signature revoked: ${revocation_reason}`,
        actor_id: user.id,
        actor_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        event_metadata: { revocation_reason }
      });

      // Log to main audit system
      await AuditService.createAuditLog({
        user_id: user.id,
        action: 'SIGNATURE_REVOKE',
        resource_type: 'electronic_signature',
        resource_id: String(id),
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        status: 'success',
        metadata: JSON.stringify({ revocation_reason })
      }, {}, { immediate: true });

      reply.code(200);
      return {
        status: 200,
        message: 'Signature revoked successfully',
        data: {
          signature_id: parseInt(id),
          status: 'REVOKED',
          revoked_at: new Date().toISOString(),
          revoked_by: user.email
        }
      };
    } catch (error) {
      logger.error('Error revoking signature:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error revoking signature',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get pending cosignatures for a user
   * GET /electronic-signatures/pending-cosignatures
   */
  async getPendingCosignatures(request, reply) {
    try {
      const user = request.user;
      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required'
        };
      }

      // Find signatures pending cosignature by this user or their role
      const results = await db
        .select()
        .from(electronic_signatures)
        .where(and(
          eq(electronic_signatures.status, 'PENDING_REVIEW'),
          eq(electronic_signatures.requires_cosigner, true),
          isNull(electronic_signatures.cosigner_signature_id),
          or(
            eq(electronic_signatures.required_cosigner_id, user.id),
            eq(electronic_signatures.required_cosigner_role, user.role),
            and(
              isNull(electronic_signatures.required_cosigner_id),
              isNull(electronic_signatures.required_cosigner_role)
            )
          )
        ))
        .orderBy(desc(electronic_signatures.signed_at));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching pending cosignatures:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pending cosignatures',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get signature audit trail
   * GET /electronic-signatures/:id/audit-trail
   */
  async getAuditTrail(request, reply) {
    try {
      const { id } = request.params;

      const signature = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!signature[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Electronic signature not found'
        };
      }

      const auditEvents = await db
        .select()
        .from(signature_audit_events)
        .where(eq(signature_audit_events.signature_id, parseInt(id)))
        .orderBy(desc(signature_audit_events.created_at));

      reply.code(200);
      return {
        status: 200,
        data: {
          signature: signature[0],
          audit_events: auditEvents
        }
      };
    } catch (error) {
      logger.error('Error fetching signature audit trail:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching signature audit trail',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a verification token for external verification
   * POST /electronic-signatures/:id/verification-token
   */
  async createVerificationToken(request, reply) {
    try {
      const { id } = request.params;
      const { expires_in_hours = 24, max_uses = null } = request.body;
      const user = request.user;

      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required'
        };
      }

      const signature = await db
        .select()
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, parseInt(id)))
        .limit(1);

      if (!signature[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Electronic signature not found'
        };
      }

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expires_in_hours);

      const result = await db
        .insert(signature_verification_tokens)
        .values({
          signature_id: parseInt(id),
          token,
          expires_at: expiresAt,
          max_uses: max_uses,
          created_by_id: user.id
        })
        .returning();

      // Log token creation
      await db.insert(signature_audit_events).values({
        signature_id: parseInt(id),
        event_type: 'VERIFICATION_TOKEN_CREATED',
        event_description: 'Verification token created for external verification',
        actor_id: user.id,
        actor_name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        event_metadata: { token_id: result[0].id, expires_at: expiresAt }
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Verification token created',
        data: {
          token,
          expires_at: expiresAt,
          max_uses,
          verification_url: `/api/electronic-signatures/verify-token/${token}`
        }
      };
    } catch (error) {
      logger.error('Error creating verification token:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating verification token',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Verify signature using external token
   * GET /electronic-signatures/verify-token/:token
   */
  async verifyByToken(request, reply) {
    try {
      const { token } = request.params;

      const tokenResult = await db
        .select()
        .from(signature_verification_tokens)
        .where(and(
          eq(signature_verification_tokens.token, token),
          eq(signature_verification_tokens.is_active, true)
        ))
        .limit(1);

      if (!tokenResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Invalid or expired verification token'
        };
      }

      const verificationToken = tokenResult[0];

      // Check expiration
      if (verificationToken.expires_at && new Date() > verificationToken.expires_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Verification token has expired'
        };
      }

      // Check max uses
      if (verificationToken.max_uses && verificationToken.use_count >= verificationToken.max_uses) {
        reply.code(400);
        return {
          status: 400,
          message: 'Verification token has reached maximum uses'
        };
      }

      // Get signature
      const signature = await db
        .select({
          id: electronic_signatures.id,
          signer_name: electronic_signatures.signer_name,
          signer_email: electronic_signatures.signer_email,
          signer_credentials: electronic_signatures.signer_credentials,
          signature_meaning: electronic_signatures.signature_meaning,
          signature_statement: electronic_signatures.signature_statement,
          document_type: electronic_signatures.document_type,
          document_id: electronic_signatures.document_id,
          document_version: electronic_signatures.document_version,
          document_hash: electronic_signatures.document_hash,
          signed_at: electronic_signatures.signed_at,
          status: electronic_signatures.status
        })
        .from(electronic_signatures)
        .where(eq(electronic_signatures.id, verificationToken.signature_id))
        .limit(1);

      if (!signature[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Signature not found'
        };
      }

      // Increment use count
      await db
        .update(signature_verification_tokens)
        .set({
          use_count: sql`${signature_verification_tokens.use_count} + 1`
        })
        .where(eq(signature_verification_tokens.id, verificationToken.id));

      // Log verification
      await db.insert(signature_audit_events).values({
        signature_id: verificationToken.signature_id,
        event_type: 'EXTERNAL_VERIFICATION',
        event_description: 'Signature verified using external token',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        event_metadata: { token_id: verificationToken.id }
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Signature verified successfully',
        data: {
          ...signature[0],
          verification_timestamp: new Date().toISOString(),
          is_valid: signature[0].status === 'VALID'
        }
      };
    } catch (error) {
      logger.error('Error verifying by token:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error verifying signature',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get user's signature history
   * GET /electronic-signatures/my-signatures
   */
  async getMySignatures(request, reply) {
    try {
      const user = request.user;
      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required'
        };
      }

      const { limit = 50, offset = 0, status, document_type, start_date, end_date } = request.query;

      let conditions = [eq(electronic_signatures.signer_id, user.id)];

      if (status) {
        conditions.push(eq(electronic_signatures.status, status));
      }

      if (document_type) {
        conditions.push(eq(electronic_signatures.document_type, document_type));
      }

      if (start_date) {
        conditions.push(gte(electronic_signatures.signed_at, new Date(start_date)));
      }

      if (end_date) {
        conditions.push(lte(electronic_signatures.signed_at, new Date(end_date)));
      }

      const results = await db
        .select()
        .from(electronic_signatures)
        .where(and(...conditions))
        .orderBy(desc(electronic_signatures.signed_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching user signatures:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching signatures',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get compliance report for signatures
   * GET /electronic-signatures/compliance-report
   */
  async getComplianceReport(request, reply) {
    try {
      const user = request.user;
      if (!user) {
        reply.code(401);
        return {
          status: 401,
          message: 'Authentication required'
        };
      }

      const { start_date, end_date } = request.query;

      const startDateTime = start_date ? new Date(start_date) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDateTime = end_date ? new Date(end_date) : new Date();

      // Total signatures
      const totalSignatures = await db
        .select({ count: sql`count(*)` })
        .from(electronic_signatures)
        .where(and(
          gte(electronic_signatures.signed_at, startDateTime),
          lte(electronic_signatures.signed_at, endDateTime)
        ));

      // Signatures by status
      const byStatus = await db
        .select({
          status: electronic_signatures.status,
          count: sql`count(*)`
        })
        .from(electronic_signatures)
        .where(and(
          gte(electronic_signatures.signed_at, startDateTime),
          lte(electronic_signatures.signed_at, endDateTime)
        ))
        .groupBy(electronic_signatures.status);

      // Signatures by meaning
      const byMeaning = await db
        .select({
          meaning: electronic_signatures.signature_meaning,
          count: sql`count(*)`
        })
        .from(electronic_signatures)
        .where(and(
          gte(electronic_signatures.signed_at, startDateTime),
          lte(electronic_signatures.signed_at, endDateTime)
        ))
        .groupBy(electronic_signatures.signature_meaning);

      // Signatures by document type
      const byDocumentType = await db
        .select({
          document_type: electronic_signatures.document_type,
          count: sql`count(*)`
        })
        .from(electronic_signatures)
        .where(and(
          gte(electronic_signatures.signed_at, startDateTime),
          lte(electronic_signatures.signed_at, endDateTime)
        ))
        .groupBy(electronic_signatures.document_type);

      // Pending cosignatures
      const pendingCosignatures = await db
        .select({ count: sql`count(*)` })
        .from(electronic_signatures)
        .where(and(
          eq(electronic_signatures.status, 'PENDING_REVIEW'),
          eq(electronic_signatures.requires_cosigner, true),
          isNull(electronic_signatures.cosigner_signature_id)
        ));

      // Overdue cosignatures
      const overdueCosignatures = await db
        .select({ count: sql`count(*)` })
        .from(electronic_signatures)
        .where(and(
          eq(electronic_signatures.status, 'PENDING_REVIEW'),
          eq(electronic_signatures.requires_cosigner, true),
          isNull(electronic_signatures.cosigner_signature_id),
          lte(electronic_signatures.cosignature_deadline, new Date())
        ));

      reply.code(200);
      return {
        status: 200,
        data: {
          period: {
            start: startDateTime,
            end: endDateTime
          },
          summary: {
            total_signatures: Number(totalSignatures[0]?.count || 0),
            pending_cosignatures: Number(pendingCosignatures[0]?.count || 0),
            overdue_cosignatures: Number(overdueCosignatures[0]?.count || 0)
          },
          by_status: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
          by_meaning: byMeaning.map(r => ({ meaning: r.meaning, count: Number(r.count) })),
          by_document_type: byDocumentType.map(r => ({ document_type: r.document_type, count: Number(r.count) })),
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating compliance report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new ElectronicSignatureController();
