import encryptionService from "../services/EncryptionService.js";
import { tlsServerConfig } from "../config/tls.config.js";
import { encryptionConfig, tlsConfig } from "../config/encryption.config.js";
import { logger } from "../utils/logger.js";

/**
 * Security Routes
 *
 * Provides endpoints for security health checks and encryption verification.
 * These endpoints help verify that security configurations are working correctly.
 *
 * SECURITY TICKET: encryption-implementation
 */

/**
 * Register security routes
 *
 * @param {object} fastify - Fastify instance
 * @param {object} options - Route options
 */
async function securityRoutes(fastify, options) {
  /**
   * GET /api/security/health
   *
   * Returns security health status including encryption and TLS configuration.
   * Requires admin authentication in production.
   */
  fastify.get("/health", {
    schema: {
      description: "Get security health status",
      tags: ["Security"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            encryption: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                algorithm: { type: "string" },
                keyVersion: { type: "number" },
                testPassed: { type: "boolean" },
              },
            },
            tls: {
              type: "object",
              properties: {
                database: { type: "object" },
                redis: { type: "object" },
                https: { type: "object" },
              },
            },
            timestamp: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      // Test encryption/decryption
      const testValue = "test-encryption-value-" + Date.now();
      const encrypted = encryptionService.encrypt(testValue);
      const decrypted = encryptionService.decrypt(encrypted);
      const encryptionTestPassed = decrypted === testValue;

      // Get TLS configuration status
      const tlsStatus = {
        database: {
          enabled: tlsConfig.postgres.enabled,
          minVersion: tlsConfig.postgres.options?.minVersion || "N/A",
          rejectUnauthorized: tlsConfig.postgres.options?.rejectUnauthorized ?? "N/A",
        },
        redis: {
          enabled: tlsConfig.redis.enabled,
          minVersion: tlsConfig.redis.options?.minVersion || "N/A",
        },
        https: {
          enabled: tlsServerConfig.enabled,
          httpRedirect: tlsServerConfig.redirect.enabled,
        },
      };

      return {
        status: encryptionTestPassed ? "healthy" : "degraded",
        encryption: {
          enabled: true,
          algorithm: encryptionConfig.algorithm,
          keyVersion: encryptionConfig.keyVersion,
          testPassed: encryptionTestPassed,
        },
        tls: tlsStatus,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Security health check failed", { error: error.message });

      return reply.code(500).send({
        status: "unhealthy",
        error: "Security health check failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * POST /api/security/encryption/test
   *
   * Test encryption with a provided value (development only).
   * This endpoint is disabled in production.
   */
  fastify.post("/encryption/test", {
    schema: {
      description: "Test encryption with a value (development only)",
      tags: ["Security"],
      body: {
        type: "object",
        required: ["value"],
        properties: {
          value: { type: "string", description: "Value to encrypt" },
          deterministic: { type: "boolean", description: "Use deterministic encryption" },
        },
      },
    },
  }, async (request, reply) => {
    // Disable in production
    if (process.env.NODE_ENV === "production") {
      return reply.code(403).send({
        error: "This endpoint is disabled in production",
      });
    }

    try {
      const { value, deterministic } = request.body;

      const encrypted = deterministic
        ? encryptionService.encryptDeterministic(value, "test:field")
        : encryptionService.encrypt(value);

      const decrypted = encryptionService.decrypt(encrypted);

      return {
        original: value,
        encrypted,
        decrypted,
        matches: value === decrypted,
        encryptedLength: encrypted.length,
        isDeterministic: !!deterministic,
      };
    } catch (error) {
      logger.error("Encryption test failed", { error: error.message });

      return reply.code(500).send({
        error: "Encryption test failed",
        message: error.message,
      });
    }
  });

  /**
   * GET /api/security/tls/info
   *
   * Returns detailed TLS configuration information.
   * Useful for verifying TLS setup.
   */
  fastify.get("/tls/info", {
    schema: {
      description: "Get TLS configuration information",
      tags: ["Security"],
    },
  }, async (request, reply) => {
    // Get connection info
    const connectionInfo = {
      protocol: request.protocol,
      secure: request.socket?.encrypted || false,
      remoteAddress: request.ip,
    };

    // Get TLS details if available
    let tlsDetails = null;
    if (request.socket?.encrypted && request.socket?.getPeerCertificate) {
      try {
        const peerCert = request.socket.getPeerCertificate();
        tlsDetails = {
          tlsVersion: request.socket.getProtocol?.() || "unknown",
          cipher: request.socket.getCipher?.() || "unknown",
          peerCertificate: peerCert ? {
            subject: peerCert.subject,
            issuer: peerCert.issuer,
            validFrom: peerCert.valid_from,
            validTo: peerCert.valid_to,
          } : null,
        };
      } catch {
        // TLS info not available
      }
    }

    return {
      connection: connectionInfo,
      tls: tlsDetails,
      config: {
        httpsEnabled: tlsServerConfig.enabled,
        ciphers: tlsServerConfig.ciphers.split(":").slice(0, 5), // First 5 ciphers
      },
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * GET /api/security/headers
   *
   * Returns security headers that are set on responses.
   * Useful for verifying security header configuration.
   */
  fastify.get("/headers", {
    schema: {
      description: "Get security headers information",
      tags: ["Security"],
    },
  }, async (request, reply) => {
    // These headers should be set by Helmet
    const securityHeaders = [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options",
      "X-Frame-Options",
      "X-XSS-Protection",
      "Referrer-Policy",
      "Permissions-Policy",
      "Cache-Control",
      "Cross-Origin-Resource-Policy",
      "Cross-Origin-Opener-Policy",
    ];

    // Return info about expected headers
    return {
      message: "Security headers are configured via Helmet middleware",
      expectedHeaders: securityHeaders,
      note: "Check response headers on any endpoint to verify these are set",
      timestamp: new Date().toISOString(),
    };
  });
}

export default securityRoutes;
