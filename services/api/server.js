import Fastify from "fastify";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import connectDB from "./src/database/connection.js";
import { closeDB } from "./src/database/connection.js";
import apiRoutes from "./src/routes/api.routes.js";
import errorHandler, { notFoundHandler } from "./src/middleware/error.middleware.js";
import corsMiddleware from "./src/middleware/cors.middleware.js";
import RouteServiceProvider from "./src/providers/RouteServiceProvider.js";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import auth from "./src/config/betterAuth.js";
import authRoutes from "./src/routes/auth.routes.js";
import emailRoutes from "./src/routes/email.routes.js";
import seedDatabase from "./src/database/seed.js";
import fixUserHasRolesTable from "./scripts/fix_user_has_roles.js";
import fixPatientsColumns from "./scripts/fix_patients_columns.js";
import originMiddleware from "./src/middleware/origin.middleware.js";
import cookieFixMiddleware from "./src/middleware/cookie-fix.middleware.js";
import { sessionTimeoutMiddleware } from "./src/middleware/session-timeout.middleware.js";
import { csrfAutoProtect } from "./src/middleware/csrf.middleware.js";
import { loggerConfig } from "./src/config/logging.config.js";
import { logger, info, warn, error, debug } from "./src/utils/logger.js";
import { db } from "./src/config/db.drizzle.js";
import { users, roles, user_has_roles } from "./src/db/schemas/index.js";
import { eq } from "drizzle-orm";
import { ROLES, ROLE_PERMISSIONS } from "./src/config/rbac.js";
import JobScheduler from "./src/jobs/scheduler.js";
import helmetConfig, { additionalSecurityHeaders } from "./src/config/helmet.config.js";
import { buildGlobalRateLimitConfig, getRedisStore, RATE_LIMITS } from "./src/config/rateLimit.config.js";

// Load environment variables
dotenv.config();

// Get directory name for static file serving
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Fastify app with enhanced Pino logger (TICKET #015)
// HIPAA-compliant PHI/PII redaction configured in logging.config.js
const app = Fastify({
  logger: loggerConfig,
  trustProxy: true, // Enable trust proxy for Render/deployment platforms
  bodyLimit: 50 * 1024 * 1024, // 50mb
});

const PORT = process.env.PORT || 3000;

// Initialize Socket.IO - will be attached after Fastify is ready
let io;

async function buildUserProfile(userPayload, originalEmail) {
  if (!userPayload) {
    return null;
  }

  const enrichedUser = {
    ...userPayload,
    email: originalEmail || userPayload.email,
  };

  try {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userPayload.id))
      .limit(1);

    if (dbUser.length > 0) {
      const storedUser = dbUser[0];

      if (
        originalEmail &&
        storedUser.email &&
        storedUser.email.toLowerCase() !== originalEmail.toLowerCase()
      ) {
        await db
          .update(users)
          .set({ email: originalEmail })
          .where(eq(users.id, userPayload.id));
      }

      enrichedUser.firstName = storedUser.firstName || null;
      enrichedUser.lastName = storedUser.lastName || null;
    } else {
      enrichedUser.firstName = null;
      enrichedUser.lastName = null;
    }

    const userRoles = await db
      .select()
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, userPayload.id))
      .limit(1);

    let roleName = ROLES.PATIENT;
    if (userRoles.length > 0) {
      const roleRecords = await db
        .select()
        .from(roles)
        .where(eq(roles.id, userRoles[0].role_id))
        .limit(1);
      if (roleRecords.length > 0) {
        roleName = roleRecords[0].name;
      }
    }

    enrichedUser.role = roleName;
    enrichedUser.permissions = ROLE_PERMISSIONS[roleName] || [];
  } catch (err) {
    error("Error building user profile", err);
    enrichedUser.firstName ??= null;
    enrichedUser.lastName ??= null;
    enrichedUser.role ??= ROLES.PATIENT;
    enrichedUser.permissions ??= ROLE_PERMISSIONS[ROLES.PATIENT] || [];
  }

  const { password, ...userWithoutPassword } = enrichedUser;
  return userWithoutPassword;
}

// Register Fastify plugins
app.register(import("@fastify/cookie"));

// CSRF Protection (SECURITY: TICKET #004 - Prevent Cross-Site Request Forgery)
app.register(import("@fastify/csrf-protection"), {
  sessionPlugin: '@fastify/cookie',
  cookieOpts: {
    signed: true,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // Only secure cookies in production
    path: '/'
  }
});

const defaultCorsOrigins = ["http://localhost:3000", "http://localhost:3001"];
const allowedCorsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : defaultCorsOrigins;

function resolveCorsOrigin(origin, cb) {
  if (!origin) {
    // No origin header (e.g., Postman) → disable CORS handling and let route continue
    return cb(null, false);
  }

  if (allowedCorsOrigins.includes(origin)) {
    return cb(null, origin);
  }

  return cb(null, false);
}

app.register(import("@fastify/cors"), {
  origin: resolveCorsOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
});
// Helmet Security Headers (SECURITY: helmet-security-headers)
// Comprehensive HTTP security headers for HIPAA compliance
// Configuration includes: CSP, HSTS, X-Frame-Options, and other protections
app.register(import("@fastify/helmet"), helmetConfig);

// Rate Limiting (SECURITY: TICKET #003 - Prevent brute-force attacks)
// Tiered rate limiting: 100 req/min unauthenticated, 500 req/min authenticated
// Uses Redis for distributed rate limiting when available
app.register(async function rateLimitPlugin(fastify) {
  const rateLimit = (await import("@fastify/rate-limit")).default;

  // Try to get Redis for distributed rate limiting
  let redisClient = null;
  try {
    redisClient = await getRedisStore();
  } catch (err) {
    warn("Redis not available for rate limiting, using in-memory store", { error: err.message });
  }

  // Build and register the rate limit config
  const rateLimitConfig = buildGlobalRateLimitConfig(redisClient);
  await fastify.register(rateLimit, rateLimitConfig);

  info("Rate limiting initialized", {
    unauthenticatedLimit: RATE_LIMITS.UNAUTHENTICATED.max,
    authenticatedLimit: RATE_LIMITS.AUTHENTICATED.max,
    timeWindow: RATE_LIMITS.UNAUTHENTICATED.timeWindow,
    redisEnabled: !!redisClient,
  });
});

app.register(import("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

// Initialize Socket.IO - decorate early, initialize in onReady
app.decorate("io", null); // Placeholder - will be set in onReady hook

app.addHook("onReady", async () => {
  io = new Server(app.server, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(",")
        : "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
    },
  });

  // Update the io instance
  app.io = io;

  // WebSocket connection handler
  io.on("connection", (socket) => {
    debug("WebSocket user connected", { socketId: socket.id });

    // Handle disconnection
    socket.on("disconnect", () => {
      debug("WebSocket user disconnected", { socketId: socket.id });
    });
  });
});

// Boot service providers (async)
app.register(async (fastify) => {
  await RouteServiceProvider.boot(fastify);
});

// Add hook to set additional security headers (SECURITY: helmet-security-headers)
// Includes HIPAA-compliant cache control and permissions policy
app.addHook("onSend", async (request, reply) => {
  // Cross-origin headers for API compatibility
  reply.header("Cross-Origin-Resource-Policy", "cross-origin");
  reply.header("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  reply.header("Cross-Origin-Embedder-Policy", "unsafe-none");

  // Additional security headers from helmet.config.js
  Object.entries(additionalSecurityHeaders).forEach(([header, value]) => {
    reply.header(header, value);
  });
});

// Register cookie fix middleware as a hook
app.addHook("onRequest", cookieFixMiddleware);

// Register audit logging hook for patient routes
// This will log all health data operations
app.addHook("onResponse", async (request, reply) => {
  // Only log audit for patient-related routes
  if (request.url.startsWith("/api/patient") || 
      request.url.startsWith("/api/discharge") ||
      request.url.startsWith("/api/admission-information") ||
      request.url.startsWith("/api/cardiac-assessment") ||
      request.url.startsWith("/api/benefit-period")) {
    try {
      const { auditLogHandler } = await import("./src/middleware/audit.middleware.js");
      await auditLogHandler(request, reply);
    } catch (err) {
      // Don't fail the request if audit logging fails
      error("Audit logging hook error", err);
    }
  }
});

// Add Origin header if missing (for Postman/API client testing)
app.addHook("onRequest", async (request, reply) => {
  if (request.url.startsWith("/api/auth") && !request.headers.origin) {
    const baseURL =
      process.env.BETTER_AUTH_URL || `https://${request.headers.host}`;
    const url = new URL(baseURL);
    request.headers.origin = url.origin;
    if (request.raw?.headers) {
      request.raw.headers.origin = url.origin;
    }
    warn("Added default Origin header for testing", { origin: request.headers.origin });
  }
});

// Register CORS middleware as a hook
app.addHook("onRequest", corsMiddleware);

// Register session timeout middleware for HIPAA compliance (TICKET #013)
// Enforces 15-minute idle timeout and 8-hour absolute timeout
app.addHook("onRequest", sessionTimeoutMiddleware);

// Register CSRF protection for all state-changing operations (SECURITY: TICKET #004)
// Validates CSRF token for POST, PUT, DELETE, PATCH requests
// Token must be included in x-csrf-token header
// Frontend should fetch token from GET /api/auth/csrf-token
app.addHook("preHandler", csrfAutoProtect);

// Register routes (will be registered after plugins are loaded)
app.register(authRoutes, { prefix: "/api/auth" });
app.register(emailRoutes, { prefix: "/api/email" });

// Better Auth handler - handles Better Auth's built-in endpoints
// This must be registered AFTER custom auth routes to avoid conflicts
// Skip custom routes that we handle ourselves
app.all("/api/auth/*", async (request, reply) => {
  try {
    const url = request.url;

    // Skip custom routes that we handle in authRoutes (exact matches only)
    // Better Auth endpoints like /api/auth/sign-in/email should still go through
    const customRoutes = [
      "/api/auth/sign-up",
      "/api/auth/sign-in",
      "/api/auth/sign-out",
      "/api/auth/admin-only",
      "/api/auth/medical-staff",
      "/api/auth/view-patients",
      "/api/auth/me",
      "/api/auth/create-admin",
    ];

    // Check if this is a custom route (exact match only, not sub-paths)
    if (customRoutes.some((route) => url === route)) {
      // This should have been handled by authRoutes, but if we reach here, it's a 404
      return reply.code(404).send({
        status: 404,
        message: "Route not found",
      });
    }

    // Handle /api/auth/sign-in/email preflight
    if (url === "/api/auth/sign-in/email" && request.method === "OPTIONS") {
      const origin =
        request.headers.origin ||
        request.headers["x-forwarded-origin"] ||
        undefined;
      if (origin) {
        reply.header("Access-Control-Allow-Origin", origin);
      }
      reply.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS,PATCH"
      );
      reply.header(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Requested-With,Accept,Origin,X-CSRF-TOKEN,X-XSRF-TOKEN"
      );
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Max-Age", "86400");
      return reply.code(204).send();
    }

    // Handle /api/auth/sign-in/email to add extra profile data while still using Better Auth
    if (url === "/api/auth/sign-in/email" && request.method === "POST") {
      debug("Handling /api/auth/sign-in/email with custom response");

      try {
        const protocol =
          request.headers["x-forwarded-proto"] ||
          (request.headers.origin
            ? new URL(request.headers.origin).protocol.replace(":", "")
            : null) ||
          (request.socket.encrypted ? "https" : "http");
        const host = request.headers[":authority"] || request.headers.host;
        const fullUrl = `${protocol}://${host}${request.url}`;

        const headers = fromNodeHeaders({
          ...request.headers,
          origin: request.headers.origin || `${protocol}://${host}`,
        });

        let bodyInit;
        if (request.body) {
          if (typeof request.body === "string") {
            bodyInit = request.body;
          } else {
            bodyInit = JSON.stringify(request.body);
            if (!headers.has("content-type")) {
              headers.set("content-type", "application/json");
            }
          }
        }

        const webRequest = new Request(fullUrl, {
          method: request.method,
          headers,
          body: bodyInit,
        });

        const betterResponse = await auth.handler(webRequest);

        betterResponse.headers.forEach((value, key) => {
          if (key.toLowerCase() === "set-cookie") {
            const existing = reply.getHeader("set-cookie");
            if (existing) {
              const currentCookies = Array.isArray(existing)
                ? existing
                : [existing];
              reply.header("set-cookie", [...currentCookies, value]);
            } else {
              reply.header("set-cookie", value);
            }
          } else if (key.toLowerCase() === "access-control-allow-origin") {
            const origin =
              request.headers.origin ||
              request.headers["x-forwarded-origin"] ||
              defaultCorsOrigins[0];
            reply.header("Access-Control-Allow-Origin", origin);
          } else if (key.toLowerCase() === "access-control-allow-credentials") {
            reply.header("Access-Control-Allow-Credentials", "true");
          } else {
            reply.header(key, value);
          }
        });

        const originHeader =
          request.headers.origin ||
          request.headers["x-forwarded-origin"] ||
          defaultCorsOrigins[0];
        reply.header("Access-Control-Allow-Origin", originHeader);
        reply.header("Access-Control-Allow-Credentials", "true");

        const statusCode = betterResponse.status;
        let responseBody = null;
        const responseText = await betterResponse.text();
        if (responseText) {
          try {
            responseBody = JSON.parse(responseText);
          } catch (parseError) {
            error("Failed to parse Better Auth response JSON", parseError);
            responseBody = responseText;
          }
        }

        const originalEmail =
          request.body?.email ||
          responseBody?.user?.email ||
          responseBody?.data?.user?.email;

        if (responseBody && typeof responseBody === "object") {
          if (responseBody.user) {
            responseBody.user = await buildUserProfile(
              responseBody.user,
              originalEmail
            );
          } else if (responseBody.data?.user) {
            responseBody.data.user = await buildUserProfile(
              responseBody.data.user,
              originalEmail
            );
          }
        }

        return reply.code(statusCode).send(responseBody ?? {});
      } catch (authError) {
        error("Custom sign-in/email handler error", authError);
        return reply.code(500).send({
          status: 500,
          message: "Server error during sign in",
        });
      }
    }

    // Old direct API approach - kept for reference but not used
    if (
      false &&
      url === "/api/auth/sign-in/email" &&
      request.method === "POST"
    ) {
      debug("Handling /api/auth/sign-in/email directly");
      try {
        const { fromNodeHeaders } = await import("better-auth/node");
        const { db } = await import("./src/config/db.drizzle.js");
        const { users, roles, user_has_roles } = await import(
          "./src/db/schemas/index.js"
        );
        const { ROLES, ROLE_PERMISSIONS } = await import(
          "./src/config/rbac.js"
        );
        const { eq } = await import("drizzle-orm");

        const response = await auth.api.signInEmail({
          body: request.body,
          headers: fromNodeHeaders(request.headers),
          cookies: request.cookies,
        });

        // Forward headers from Better Auth response
        if (response && response.headers) {
          if (
            response.headers instanceof Headers ||
            typeof response.headers.forEach === "function"
          ) {
            response.headers.forEach((value, key) => {
              reply.header(key, value);
            });
          } else if (typeof response.headers === "object") {
            Object.entries(response.headers).forEach(([key, value]) => {
              if (Array.isArray(value)) {
                value.forEach((val) => reply.header(key, val));
              } else {
                reply.header(key, value);
              }
            });
          }
        }

        if (!response || !response.user) {
          return reply.code(401).send({
            status: 401,
            message: "Invalid email or password",
            code: "INVALID_EMAIL_OR_PASSWORD",
          });
        }

        // Preserve original email case from request body (before database fetch)
        const originalEmail = request.body?.email || response.user.email;

        // Log sign-in success with user details (PHI is sanitized by logger)
        info("Sign-in successful for /api/auth/sign-in/email", {
          sessionCreated: !!response.session,
          sessionId: response.session?.id || "N/A",
          hasCookies: (reply.getHeaders()["set-cookie"] || []).length > 0
        });

        // Get user's full details from database (including firstName, lastName, and role)
        let userRole = ROLES.PATIENT;

        let fullUser = {
          ...response.user,
          email: originalEmail, // Always use original email case from request
        };

        try {
          // Fetch complete user record from database to get firstName and lastName
          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.id, response.user.id))
            .limit(1);

          if (dbUser.length > 0) {
            // Update email in database to preserve original case (if different)
            if (dbUser[0].email.toLowerCase() !== originalEmail.toLowerCase()) {
              // Email case is different, update it in database
              await db
                .update(users)
                .set({ email: originalEmail })
                .where(eq(users.id, response.user.id));
              debug("Updated email case in database");
            }

            fullUser = {
              ...response.user,
              email: originalEmail, // Keep original email case from request, not from database
              firstName: dbUser[0].firstName || null,
              lastName: dbUser[0].lastName || null,
            };
          }

          // Get user's role from database
          const userRoles = await db
            .select()
            .from(user_has_roles)
            .where(eq(user_has_roles.user_id, response.user.id))
            .limit(1);

          if (userRoles.length > 0) {
            const roleRecords = await db
              .select()
              .from(roles)
              .where(eq(roles.id, userRoles[0].role_id))
              .limit(1);

            if (roleRecords.length > 0) {
              userRole = roleRecords[0].name;
            }
          }
        } catch (err) {
          error("Error loading user details during sign-in/email", err);
          // Continue with response.user if database fetch fails
        }

        // Remove password from response if present
        const { password, ...userWithoutPassword } = fullUser;

        // Get permissions for the user's role
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        // Note: Better Auth's signInEmail API with autoSignIn: true should create session
        // But cookies need to be set via Better Auth handler
        // For now, we'll rely on the custom /api/auth/sign-in route which properly sets cookies
        // Or use Better Auth handler directly for /api/auth/sign-in/email

        return reply.code(200).send({
          status: 200,
          message: "User logged in successfully",
          data: {
            user: {
              ...userWithoutPassword,
              role: userRole,
              permissions: permissions,
            },
          },
        });
      } catch (err) {
        error("Better Auth sign-in/email error", err);
        if (err.statusCode === 401 || err.status === "UNAUTHORIZED") {
          return reply.code(401).send({
            status: 401,
            message: err.body?.message || "Invalid email or password",
            code: err.body?.code || "INVALID_EMAIL_OR_PASSWORD",
          });
        }
        return reply.code(500).send({
          status: 500,
          message: "Server error during sign in",
          error:
            process.env.NODE_ENV === "development" ? err.message : undefined,
        });
      }
    }

    debug("Better Auth handler called", { method: request.method, url });

    // For other Better Auth endpoints, use the handler
    reply.hijack();
    const handler = toNodeHandler(auth.handler);
    handler(request.raw, reply.raw);
  } catch (err) {
    error("Better Auth handler error", { url: request.url, err });
    if (!reply.sent) {
      reply.code(500).send({
        status: 500,
        message: "Server error in auth handler",
        error:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }
});

// Other routes
app.register(apiRoutes, { prefix: "/api" });

// 404 handler for API routes - HIPAA-compliant with tracking ID
app.setNotFoundHandler(notFoundHandler);

// Health check endpoint for Render
app.get("/health", async (request, reply) => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// Global error handler
app.setErrorHandler(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  info("Graceful shutdown initiated", { signal });

  // Close Fastify app
  await app.close();

  // Stop job scheduler
  JobScheduler.stop();

  // Close Socket.IO if initialized
  if (io) {
    io.close();
  }

  // Close Redis connection
  try {
    const redisService = (await import("./src/services/RedisService.js")).default;
    await redisService.disconnect();
  } catch (redisError) {
    // Redis may not be initialized
  }

  // Close database connection
  await closeDB();

  // Exit process
  process.exit(0);

  // Force shutdown after 10 seconds
  setTimeout(() => {
    error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server and connect to database
const startServer = async () => {
  try {
    // Fix user_has_roles table if needed
    try {
      await fixUserHasRolesTable();
      info("user_has_roles table checked/fixed");
    } catch (fixError) {
      error("Error fixing user_has_roles table", fixError);
      // Don't exit here, continue with startup
    }

    // Ensure patients table has required columns
    try {
      await fixPatientsColumns();
      info("patients table checked/fixed");
    } catch (patientsFixError) {
      error("Error fixing patients table", patientsFixError);
    }

    // Connect to database
    await connectDB();

    // Seed database with required roles and permissions
    try {
      await seedDatabase();
      info("Database seeded successfully with required roles and permissions");
    } catch (seedError) {
      error("Error seeding database", seedError);
    }

    // Start Fastify server (Socket.IO will be initialized in onReady hook)
    await app.listen({ port: PORT, host: "0.0.0.0" });
    info("Server started", {
      port: PORT,
      authEndpoint: `http://localhost:${PORT}/api/auth/*`,
      environment: process.env.NODE_ENV || "development"
    });

    // Initialize job scheduler if enabled
    if (process.env.ENABLE_SCHEDULER === 'true') {
      JobScheduler.init();
      info("Job scheduler initialized and running");
    } else {
      info("Job scheduler disabled (set ENABLE_SCHEDULER=true to enable)");
    }

    info("Application startup completed successfully");
  } catch (err) {
    error("Failed to start server", err);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
