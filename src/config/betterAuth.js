import dotenv from "dotenv";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db.drizzle.js";
import * as schema from "../db/schemas/index.js";
import config from "./config.js";

dotenv.config();

// Get database configuration
const dbConfig = config.get("database");

// Map schema to Better Auth expected names
const betterAuthSchema = {
  user: schema.users,
  account: schema.accounts,
  session: schema.sessions,
  verification: schema.verifications,
  role: schema.roles,
  permission: schema.permissions,
  userRole: schema.user_has_roles,
  rolePermission: schema.role_has_permissions,
};

// Drizzle ORM is already initialized in db.drizzle.js

// Initialize Better Auth with RBAC support and Drizzle adapter
const auth = betterAuth({
  appName: "Charts Backend",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://ehr-fastify-server.onrender.com"
      : "http://localhost:3000"),
  // SECURITY: No fallback for BETTER_AUTH_SECRET - must be set in environment
  secret: (() => {
    if (!process.env.BETTER_AUTH_SECRET) {
      throw new Error(
        'SECURITY ERROR: BETTER_AUTH_SECRET environment variable is required. ' +
        'Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }
    return process.env.BETTER_AUTH_SECRET;
  })(),

  // Database configuration using Drizzle with custom schema mapping
  database: drizzleAdapter(db, {
    provider: "postgresql",
    schema: betterAuthSchema,
  }),

  // Email/Password authentication
  // SECURITY: TICKET #006 - Strengthened password policy
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 12, // Increased from 6 to 12 (HIPAA requirement)
    // Additional validation performed in auth routes via passwordSecurity.js:
    // - 3 of 4 character types (upper, lower, number, special)
    // - Breached password checking (HaveIBeenPwned)
    // - Common password blocking
    // - Password strength score >= 3/4 (zxcvbn)
  },

  // Social providers configuration
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      enabled:
        !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      enabled:
        !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
    },
  },

  // Session configuration
  // SECURITY: TICKET #013 - HIPAA-compliant session management
  // - 8-hour maximum session duration (absolute timeout)
  // - 15-minute idle timeout (updateAge)
  // - Automatic logoff per HIPAA §164.312(a)(2)(iii)
  session: {
    expiresIn: 60 * 60 * 8, // 8 hours (28,800 seconds) - reduced from 7 days
    updateAge: 60 * 15, // 15 minutes (900 seconds) - idle timeout, reduced from 1 day
    absoluteTimeout: 60 * 60 * 8, // 8 hours absolute maximum - no refresh allowed beyond this
  },

  // Cookies configuration for cross-origin support
  // For cross-origin requests (frontend on different domain), use sameSite: 'none' with secure: true
  // IMPORTANT: Always use 'none' when backend and frontend are on different domains
  cookies: {
    secure: true, // Required when sameSite is 'none' - MUST be true for HTTPS
    sameSite: "none", // Always 'none' to support cross-origin cookies (local frontend → production backend)
    domain: process.env.COOKIE_DOMAIN || undefined, // Don't set domain for cross-origin
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 hours - aligned with session expiration (TICKET #013)
    path: "/", // Ensure cookie is available for all paths
  },

  // RBAC configuration
  account: {
    accountLinking: {
      enabled: true,
    },
  },

  // Advanced settings
  advanced: {
    crossSubdomainCookies: {
      enabled: false,
    },
    // Cookie settings for better security
    // Use 'none' for cross-origin cookies (required when frontend and backend are on different domains)
    cookiePrefix: "better-auth",
    cookieSameSite: "none", // Always 'none' for cross-origin support
  },

  // Trusted origins for CORS (frontend URLs)
  trustedOrigins: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ehr-frontend-by-samad.vercel.app/",
        "https://ehr-frontend-by-samad-wpyl.vercel.app",
      ],
});

export default auth;
