import dotenv from "dotenv";

dotenv.config();

/**
 * Helmet Security Headers Configuration
 *
 * Provides comprehensive HTTP security headers for HIPAA compliance:
 * - Content Security Policy (CSP): Prevents XSS, data injection attacks
 * - HTTP Strict Transport Security (HSTS): Forces HTTPS connections
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - Referrer-Policy: Controls information in Referer header
 * - Permissions-Policy: Controls browser feature access
 *
 * SECURITY TICKET: helmet-security-headers
 */

const isProduction = process.env.NODE_ENV === "production";

// Parse allowed origins for CSP directives
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "http://localhost:3001"];

// Build CSP source list from allowed origins
const cspSources = allowedOrigins.map((origin) => {
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    return origin;
  }
});

/**
 * Content Security Policy Configuration
 * Strict CSP for healthcare application security
 */
const contentSecurityPolicy = {
  directives: {
    // Default fallback for unspecified directives
    defaultSrc: ["'self'"],

    // Script sources - restrict to self and trusted sources only
    // Note: 'unsafe-inline' and 'unsafe-eval' avoided for maximum security
    // If your frontend requires inline scripts, use nonces or hashes
    scriptSrc: ["'self'", ...cspSources],

    // Style sources - allow self and inline styles for UI frameworks
    // Consider using nonces for stricter security
    styleSrc: ["'self'", "'unsafe-inline'", ...cspSources],

    // Image sources - allow self, data URIs (for inline images), and trusted CDNs
    imgSrc: ["'self'", "data:", "blob:", ...cspSources],

    // Font sources
    fontSrc: ["'self'", "data:", ...cspSources],

    // Object/embed sources - disabled for security
    objectSrc: ["'none'"],

    // Media sources (audio/video)
    mediaSrc: ["'self'", "blob:"],

    // Frame sources - only allow self for security
    frameSrc: ["'self'"],

    // Child frame sources
    childSrc: ["'self'", "blob:"],

    // Worker sources (service workers, web workers)
    workerSrc: ["'self'", "blob:"],

    // Connect sources for XHR, WebSocket, fetch
    connectSrc: ["'self'", "wss:", "ws:", ...cspSources],

    // Form action destinations
    formAction: ["'self'"],

    // Base URI restriction
    baseUri: ["'self'"],

    // Frame ancestors - prevent clickjacking
    frameAncestors: ["'self'"],

    // Manifest sources
    manifestSrc: ["'self'"],

    // Upgrade insecure requests in production
    ...(isProduction && { upgradeInsecureRequests: [] }),

    // Block all mixed content in production
    ...(isProduction && { blockAllMixedContent: [] }),
  },

  // Report CSP violations (optional - configure reporting endpoint)
  // reportUri: '/api/csp-report',
};

/**
 * HTTP Strict Transport Security (HSTS) Configuration
 * Forces browsers to use HTTPS for the specified duration
 *
 * HIPAA: Ensures encrypted connections for PHI transmission
 */
const strictTransportSecurity = {
  // Max age in seconds (1 year for production, disabled in development)
  maxAge: isProduction ? 31536000 : 0,

  // Include subdomains
  includeSubDomains: isProduction,

  // Preload list eligibility (requires domain submission)
  preload: isProduction,
};

/**
 * Referrer Policy Configuration
 * Controls how much referrer information is sent
 *
 * 'strict-origin-when-cross-origin':
 * - Full URL for same-origin requests
 * - Origin only for cross-origin HTTPS→HTTPS
 * - No referrer for HTTPS→HTTP
 */
const referrerPolicy = {
  policy: "strict-origin-when-cross-origin",
};

/**
 * Permissions Policy (formerly Feature Policy)
 * Controls access to browser features
 *
 * Restrictive policy for healthcare security
 */
const permissionsPolicy = {
  // Geolocation - disabled unless specifically needed
  geolocation: [],

  // Microphone - disabled for security
  microphone: [],

  // Camera - disabled for security
  camera: [],

  // Payment - disabled
  payment: [],

  // USB - disabled
  usb: [],

  // Fullscreen - allow for document viewing
  fullscreen: ["self"],

  // Autoplay - disabled
  autoplay: [],
};

/**
 * Cross-Origin Resource Policy
 * Controls which origins can load resources
 */
const crossOriginResourcePolicy = {
  // 'cross-origin' allows resources to be loaded cross-origin
  // Required for APIs that serve resources to different origins
  policy: "cross-origin",
};

/**
 * Cross-Origin Opener Policy
 * Controls window.opener access
 */
const crossOriginOpenerPolicy = {
  // 'same-origin-allow-popups' - secure but allows auth popups
  policy: "same-origin-allow-popups",
};

/**
 * Cross-Origin Embedder Policy
 * Controls cross-origin resource embedding
 */
const crossOriginEmbedderPolicy = {
  // Disabled for API compatibility
  // Enable 'require-corp' for strictest security if not embedding resources
  policy: false,
};

/**
 * Main Helmet Configuration Object
 * Exported for use with @fastify/helmet
 */
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: isProduction ? contentSecurityPolicy : false,

  // HTTP Strict Transport Security
  hsts: strictTransportSecurity,

  // X-Frame-Options: DENY prevents all framing (strictest)
  // Alternative: SAMEORIGIN allows same-origin framing
  frameguard: {
    action: "deny",
  },

  // X-Content-Type-Options: nosniff
  // Prevents MIME type sniffing attacks
  noSniff: true,

  // X-DNS-Prefetch-Control: off
  // Controls DNS prefetching for privacy
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options: noopen (IE specific)
  ieNoOpen: true,

  // X-Permitted-Cross-Domain-Policies: none
  // Prevents Adobe Flash/PDF cross-domain access
  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },

  // X-Powered-By: removed
  // Hides server technology information
  hidePoweredBy: true,

  // X-XSS-Protection: disabled (CSP is more effective)
  // Modern browsers have deprecated this header
  xssFilter: false,

  // Referrer-Policy
  referrerPolicy,

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy,

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy,

  // Cross-Origin-Embedder-Policy (disabled for API compatibility)
  crossOriginEmbedderPolicy: false,

  // Origin-Agent-Cluster header
  originAgentCluster: true,
};

/**
 * Additional security headers not covered by Helmet
 * These should be set via onSend hook
 */
export const additionalSecurityHeaders = {
  // Cache-Control for sensitive data (HIPAA compliance)
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",

  // Pragma for HTTP/1.0 compatibility
  "Pragma": "no-cache",

  // Expires header
  "Expires": "0",

  // Permissions-Policy header (more granular than Helmet's default)
  "Permissions-Policy": Object.entries(permissionsPolicy)
    .map(([key, value]) => {
      const sources = value.length > 0 ? value.join(" ") : "";
      return `${key}=(${sources})`;
    })
    .join(", "),
};

export default helmetConfig;
