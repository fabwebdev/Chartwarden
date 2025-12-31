/**
 * Consolidated Configuration Module
 *
 * Purpose: Single source of truth for all application configuration
 * Replaces multiple scattered config files with centralized management
 *
 * TICKET #018: Consolidate Configuration Files
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

/**
 * Helper function to require environment variables
 * @param {string} key - Environment variable key
 * @param {string|null} env - Specific environment where required (null = all environments)
 * @returns {string} - Environment variable value
 * @throws {Error} - If required variable is missing
 */
function required(key, env = null) {
  const value = process.env[key];

  // If env is specified, only require in that environment
  if (env && process.env.NODE_ENV !== env) {
    return value || '';
  }

  // If no env specified or we're in the specified env, require the value
  if (!value && (!env || process.env.NODE_ENV === env)) {
    throw new Error(
      `CONFIGURATION ERROR: ${key} is required${env ? ` in ${env} environment` : ''}\n` +
      `Please set ${key} in your .env file`
    );
  }

  return value;
}

/**
 * Helper function to get environment variable with default
 * @param {string} key - Environment variable key
 * @param {any} defaultValue - Default value if not set
 * @returns {any} - Environment variable value or default
 */
function env(key, defaultValue = null) {
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

/**
 * Helper function to parse boolean environment variables
 * @param {string} key - Environment variable key
 * @param {boolean} defaultValue - Default boolean value
 * @returns {boolean} - Parsed boolean value
 */
function envBool(key, defaultValue = false) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Helper function to parse integer environment variables
 * @param {string} key - Environment variable key
 * @param {number} defaultValue - Default number value
 * @returns {number} - Parsed integer value
 */
function envInt(key, defaultValue = 0) {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Consolidated Application Configuration
 */
const config = {
  /**
   * Application Settings
   */
  app: {
    name: env('APP_NAME', 'Charts Backend'),
    env: env('NODE_ENV', env('APP_ENV', 'development')),
    debug: envBool('APP_DEBUG', false),
    url: env('APP_URL', 'http://localhost:3000'),
    port: envInt('PORT', 3000),
    timezone: env('TZ', env('APP_TIMEZONE', 'UTC')),
    locale: env('APP_LOCALE', 'en'),
    fallbackLocale: env('APP_FALLBACK_LOCALE', 'en'),
  },

  /**
   * Database Configuration
   */
  database: {
    // Primary database URL (used by Drizzle)
    url: required('DATABASE_URL'),

    // Connection pool settings
    pool: {
      max: envInt('DB_POOL_MAX', 20),
      min: envInt('DB_POOL_MIN', 2),
      idleTimeoutMillis: envInt('DB_IDLE_TIMEOUT', 30000),
      connectionTimeoutMillis: envInt('DB_CONNECTION_TIMEOUT', 2000),
    },

    // Legacy individual connection params (for backwards compatibility)
    host: env('DB_HOST', 'localhost'),
    port: envInt('DB_PORT', 5432),
    name: env('DB_DATABASE', env('DB_NAME', 'postgresdb')),
    user: env('DB_USERNAME', env('DB_USER', 'postgres')),
    password: env('DB_PASSWORD', ''),
    dialect: env('DB_DIALECT', 'postgres'),

    // SSL configuration
    ssl: envBool('DB_SSL', false),
    sslMode: env('DB_SSL_MODE', 'prefer'),
  },

  /**
   * Authentication & Security Configuration
   */
  auth: {
    // JWT Configuration
    jwt: {
      secret: required('JWT_SECRET', 'production'),
      expiresIn: env('JWT_EXPIRES_IN', '24h'),
      issuer: env('JWT_ISSUER', 'charts-backend-fastify'),
      audience: env('JWT_AUDIENCE', 'charts-frontend'),
    },

    // Better Auth Configuration
    betterAuth: {
      url: env('BETTER_AUTH_URL', 'http://localhost:3000'),
      secret: required('BETTER_AUTH_SECRET', 'production'),
    },

    // Admin Creation
    adminCreationSecret: required('ADMIN_CREATION_SECRET', 'production'),

    // Session Configuration
    session: {
      expiry: envInt('SESSION_EXPIRY', 8 * 60 * 60), // 8 hours in seconds
      secret: env('SESSION_SECRET', env('JWT_SECRET', '')),
      cookieName: env('SESSION_COOKIE_NAME', 'hospice_ehr_session'),
      secure: envBool('SESSION_SECURE', process.env.NODE_ENV === 'production'),
      sameSite: env('SESSION_SAME_SITE', 'lax'),
    },

    // Password Configuration
    password: {
      timeout: envInt('PASSWORD_TIMEOUT', 10800), // 3 hours in seconds
      resetExpiry: envInt('PASSWORD_RESET_EXPIRY', 3600), // 1 hour
    },
  },

  /**
   * CORS Configuration
   */
  cors: {
    origin: env('CORS_ORIGIN', '*'),
    credentials: envBool('CORS_CREDENTIALS', true),
    methods: env('CORS_METHODS', 'GET,POST,PUT,DELETE,PATCH,OPTIONS').split(','),
    allowedHeaders: env('CORS_HEADERS', 'Content-Type,Authorization,X-Requested-With').split(','),
    exposedHeaders: env('CORS_EXPOSED_HEADERS', '').split(',').filter(Boolean),
    maxAge: envInt('CORS_MAX_AGE', 86400), // 24 hours
  },

  /**
   * Rate Limiting Configuration
   */
  rateLimit: {
    enabled: envBool('RATE_LIMIT_ENABLED', true),
    windowMs: envInt('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    maxRequests: envInt('RATE_LIMIT_MAX_REQUESTS', 100),
    skipSuccessfulRequests: envBool('RATE_LIMIT_SKIP_SUCCESSFUL', false),
    skipFailedRequests: envBool('RATE_LIMIT_SKIP_FAILED', false),
  },

  /**
   * Logging Configuration
   */
  logging: {
    level: env('LOG_LEVEL', 'info'),
    format: env('LOG_FORMAT', 'combined'),
    directory: env('LOG_DIRECTORY', 'logs'),
    filename: env('LOG_FILENAME', 'application.log'),
    maxSize: env('LOG_MAX_SIZE', '20m'),
    maxFiles: envInt('LOG_MAX_FILES', 14),
    datePattern: env('LOG_DATE_PATTERN', 'YYYY-MM-DD'),
  },

  /**
   * Mail Configuration
   */
  mail: {
    host: env('MAIL_HOST', 'localhost'),
    port: envInt('MAIL_PORT', 1025),
    username: env('MAIL_USERNAME', ''),
    password: env('MAIL_PASSWORD', ''),
    from: env('MAIL_FROM', 'noreply@example.com'),
    fromName: env('MAIL_FROM_NAME', env('APP_NAME', 'Charts Backend')),
    encryption: env('MAIL_ENCRYPTION', 'tls'),
    secure: envBool('MAIL_SECURE', false),
  },

  /**
   * Cache Configuration
   */
  cache: {
    driver: env('CACHE_DRIVER', 'memory'),
    ttl: envInt('CACHE_TTL', 3600), // 1 hour in seconds
    prefix: env('CACHE_PREFIX', 'hospice_ehr_'),

    // Redis configuration (if using Redis cache)
    redis: {
      host: env('REDIS_HOST', '127.0.0.1'),
      port: envInt('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', null),
      database: envInt('REDIS_DB', 0),
      keyPrefix: env('REDIS_KEY_PREFIX', 'hospice_ehr:'),
    },
  },

  /**
   * Queue Configuration
   */
  queue: {
    driver: env('QUEUE_DRIVER', 'sync'),
    connection: env('QUEUE_CONNECTION', 'default'),
    retryAfter: envInt('QUEUE_RETRY_AFTER', 90),

    // Redis queue configuration
    redis: {
      host: env('REDIS_HOST', '127.0.0.1'),
      port: envInt('REDIS_PORT', 6379),
      password: env('REDIS_PASSWORD', null),
      database: envInt('REDIS_QUEUE_DB', 1),
    },
  },

  /**
   * File Storage Configuration
   */
  filesystems: {
    default: env('FILESYSTEM_DRIVER', 'local'),

    local: {
      root: env('FILESYSTEM_LOCAL_ROOT', 'storage/app'),
    },

    public: {
      root: env('FILESYSTEM_PUBLIC_ROOT', 'storage/app/public'),
      url: env('FILESYSTEM_PUBLIC_URL', '/storage'),
    },

    // S3 configuration (if using S3)
    s3: {
      key: env('AWS_ACCESS_KEY_ID', ''),
      secret: env('AWS_SECRET_ACCESS_KEY', ''),
      region: env('AWS_DEFAULT_REGION', 'us-east-1'),
      bucket: env('AWS_BUCKET', ''),
      url: env('AWS_URL', null),
      endpoint: env('AWS_ENDPOINT', null),
    },
  },

  /**
   * Hospice-Specific Configuration
   */
  hospice: {
    // CAP (Continuous Assessment Program) Configuration
    cap: {
      alertEmail: env('CAP_ALERT_EMAIL', 'billing@hospice.example.com'),
      yearAmountCents: envInt('CAP_YEAR_AMOUNT_CENTS', 3446534),
    },

    // Certification Alerts
    certification: {
      alertEmail: env('CERTIFICATION_ALERT_EMAIL', 'clinical@hospice.example.com'),
    },

    // Scheduler Configuration
    scheduler: {
      enabled: envBool('ENABLE_SCHEDULER', false),
    },
  },

  /**
   * External Services Configuration
   */
  services: {
    // EDI (Electronic Data Interchange)
    edi: {
      endpoint: env('EDI_ENDPOINT', ''),
      apiKey: env('EDI_API_KEY', ''),
      timeout: envInt('EDI_TIMEOUT', 30000),
    },

    // Clearinghouse Configuration
    clearinghouse: {
      endpoint: env('CLEARINGHOUSE_ENDPOINT', ''),
      apiKey: env('CLEARINGHOUSE_API_KEY', ''),
      timeout: envInt('CLEARINGHOUSE_TIMEOUT', 30000),
    },
  },

  /**
   * Feature Flags
   */
  features: {
    enableAuditLogging: envBool('FEATURE_AUDIT_LOGGING', true),
    enableScheduler: envBool('ENABLE_SCHEDULER', false),
    enableCaching: envBool('FEATURE_CACHING', true),
    enableRateLimiting: envBool('FEATURE_RATE_LIMITING', true),
  },

  /**
   * Development & Debugging
   */
  debug: {
    queryLogging: envBool('DEBUG_QUERY_LOGGING', false),
    showStackTrace: envBool('DEBUG_SHOW_STACK_TRACE', process.env.NODE_ENV !== 'production'),
    verboseErrors: envBool('DEBUG_VERBOSE_ERRORS', process.env.NODE_ENV !== 'production'),
  },
};

/**
 * Validation function to check required configuration on startup
 */
export function validateConfig() {
  const errors = [];

  // Check critical required fields
  if (!config.database.url) {
    errors.push('DATABASE_URL is required');
  }

  if (config.app.env === 'production') {
    if (!config.auth.jwt.secret || config.auth.jwt.secret.length < 32) {
      errors.push('JWT_SECRET must be set and at least 32 characters in production');
    }

    if (!config.auth.betterAuth.secret || config.auth.betterAuth.secret.length < 32) {
      errors.push('BETTER_AUTH_SECRET must be set and at least 32 characters in production');
    }

    if (!config.auth.adminCreationSecret || config.auth.adminCreationSecret.length < 32) {
      errors.push('ADMIN_CREATION_SECRET must be set and at least 32 characters in production');
    }
  }

  if (errors.length > 0) {
    throw new Error(
      '❌ Configuration validation failed:\n' +
      errors.map(err => `  - ${err}`).join('\n') +
      '\n\nPlease check your .env file and set the required environment variables.'
    );
  }

  return true;
}

/**
 * Helper function to get nested config values
 * @param {string} path - Dot-notation path (e.g., 'database.pool.max')
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} - Configuration value
 */
export function get(path, defaultValue = null) {
  const keys = path.split('.');
  let value = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return defaultValue;
    }
  }

  return value;
}

/**
 * Check if application is in production environment
 */
export function isProduction() {
  return config.app.env === 'production';
}

/**
 * Check if application is in development environment
 */
export function isDevelopment() {
  return config.app.env === 'development' || config.app.env === 'local';
}

/**
 * Check if application is in test environment
 */
export function isTest() {
  return config.app.env === 'test' || config.app.env === 'testing';
}

// Validate configuration on module load
validateConfig();

// Export configuration object and helpers
export default config;
export { config, required, env, envBool, envInt };
