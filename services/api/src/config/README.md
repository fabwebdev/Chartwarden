# Configuration Module

**TICKET #018: Consolidate Configuration Files**

This directory contains the consolidated configuration system for the Hospice EHR application.

## Overview

The configuration system has been consolidated from 24+ separate files into a single, centralized configuration module (`index.js`) that:

- ✅ Loads all environment variables from `.env`
- ✅ Validates required configuration on startup
- ✅ Provides sensible defaults for all settings
- ✅ Organizes configuration by domain (app, database, auth, etc.)
- ✅ Exports helper functions for type-safe environment variable access
- ✅ Supports environment-specific validation (e.g., production requires secure secrets)

## Usage

### Importing Configuration

```javascript
// Import the entire config object
import config from '../config/index.js';

// Access configuration values
console.log(config.app.port); // 3000
console.log(config.database.url); // postgresql://...

// Import specific helper functions
import { get, env, envBool, envInt, isProduction } from '../config/index.js';

// Use helpers
const port = get('app.port'); // Nested access
const debugMode = envBool('APP_DEBUG', false);
if (isProduction()) {
  // Production-only code
}
```

### Configuration Structure

The configuration object is organized into the following sections:

```javascript
config = {
  app: { /* Application settings */ },
  database: { /* Database connection and pool settings */ },
  auth: { /* JWT, Better Auth, sessions, passwords */ },
  cors: { /* CORS configuration */ },
  rateLimit: { /* Rate limiting settings */ },
  logging: { /* Logging configuration */ },
  mail: { /* Email/SMTP configuration */ },
  cache: { /* Caching configuration (Redis, memory) */ },
  queue: { /* Queue configuration */ },
  filesystems: { /* File storage (local, S3) */ },
  hospice: { /* Hospice-specific settings (CAP, certification) */ },
  services: { /* External services (EDI, clearinghouse) */ },
  features: { /* Feature flags */ },
  debug: { /* Debug settings */ },
}
```

## Helper Functions

### `env(key, defaultValue)`

Get an environment variable with an optional default value.

```javascript
import { env } from '../config/index.js';

const apiKey = env('API_KEY', 'default-key');
const optional = env('OPTIONAL_VAR'); // Returns null if not set
```

### `envBool(key, defaultValue)`

Parse a boolean environment variable. Recognizes `'true'`, `'1'`, `'yes'` as `true`.

```javascript
import { envBool } from '../config/index.js';

const debugMode = envBool('APP_DEBUG', false);
const enableScheduler = envBool('ENABLE_SCHEDULER', false);
```

### `envInt(key, defaultValue)`

Parse an integer environment variable.

```javascript
import { envInt } from '../config/index.js';

const port = envInt('PORT', 3000);
const poolSize = envInt('DB_POOL_MAX', 20);
```

### `required(key, env)`

Require an environment variable. Throws an error if missing.

```javascript
import { required } from '../config/index.js';

const dbUrl = required('DATABASE_URL'); // Required in all environments
const jwtSecret = required('JWT_SECRET', 'production'); // Only required in production
```

### `get(path, defaultValue)`

Get nested configuration values using dot notation.

```javascript
import { get } from '../config/index.js';

const maxPool = get('database.pool.max'); // 20
const missing = get('invalid.path', 'default'); // 'default'
```

### Environment Detection

```javascript
import { isProduction, isDevelopment, isTest } from '../config/index.js';

if (isProduction()) {
  // Production-only code
}

if (isDevelopment()) {
  // Development-only code
}

if (isTest()) {
  // Test-only code
}
```

## Environment Variables

### Required Variables

These variables MUST be set in all environments:

- `DATABASE_URL` - PostgreSQL connection string

### Required in Production

These variables MUST be set in production and should be at least 32 characters:

- `JWT_SECRET` - JWT signing secret
- `BETTER_AUTH_SECRET` - Better Auth secret
- `ADMIN_CREATION_SECRET` - Admin user creation secret

### Application Configuration

- `APP_NAME` - Application name (default: "Charts Backend")
- `APP_ENV` or `NODE_ENV` - Environment (development, production, test)
- `APP_DEBUG` - Enable debug mode (default: false)
- `APP_URL` - Application URL (default: "http://localhost:3000")
- `PORT` - Server port (default: 3000)
- `TZ` or `APP_TIMEZONE` - Timezone (default: "UTC")

### Database Configuration

- `DATABASE_URL` - Full PostgreSQL connection string (REQUIRED)
- `DB_POOL_MAX` - Maximum pool connections (default: 20)
- `DB_POOL_MIN` - Minimum pool connections (default: 2)
- `DB_IDLE_TIMEOUT` - Idle timeout in ms (default: 30000)

### Authentication Configuration

- `JWT_SECRET` - JWT signing secret (required in production)
- `JWT_EXPIRES_IN` - JWT expiration (default: "24h")
- `BETTER_AUTH_URL` - Better Auth URL (default: "http://localhost:3000")
- `BETTER_AUTH_SECRET` - Better Auth secret (required in production)
- `ADMIN_CREATION_SECRET` - Admin creation secret (required in production)

### CORS Configuration

- `CORS_ORIGIN` - Allowed origins (default: "*")
- `CORS_CREDENTIALS` - Allow credentials (default: true)
- `CORS_METHODS` - Allowed methods (default: "GET,POST,PUT,DELETE,PATCH,OPTIONS")

### Logging Configuration

- `LOG_LEVEL` - Log level (default: "info")
- `LOG_FORMAT` - Log format (default: "combined")
- `LOG_MAX_FILES` - Maximum log files (default: 14)

### Mail Configuration

- `MAIL_HOST` - SMTP host (default: "localhost")
- `MAIL_PORT` - SMTP port (default: 1025)
- `MAIL_FROM` - From email address
- `MAIL_USERNAME` - SMTP username
- `MAIL_PASSWORD` - SMTP password

### Hospice-Specific Configuration

- `CAP_ALERT_EMAIL` - CAP alert email (default: "billing@hospice.example.com")
- `CAP_YEAR_AMOUNT_CENTS` - CAP yearly amount in cents (default: 3446534)
- `CERTIFICATION_ALERT_EMAIL` - Certification alert email (default: "clinical@hospice.example.com")
- `ENABLE_SCHEDULER` - Enable job scheduler (default: false)

## Validation

The configuration is validated automatically when the module is loaded. If any required variables are missing or invalid, the application will fail to start with a clear error message:

```
❌ Configuration validation failed:
  - DATABASE_URL is required
  - JWT_SECRET must be set and at least 32 characters in production

Please check your .env file and set the required environment variables.
```

## Migration Guide

### From Old Config Files

If you're migrating from the old configuration system, update your imports:

**Before:**
```javascript
import appConfig from '../config/app.config.js';
import authConfig from '../config/auth.config.js';
import databaseConfig from '../config/database.config.js';

const appName = appConfig.name;
const jwtSecret = process.env.JWT_SECRET;
```

**After:**
```javascript
import config from '../config/index.js';

const appName = config.app.name;
const jwtSecret = config.auth.jwt.secret;
```

### Specialized Config Files

The following specialized configuration files are still maintained separately as they contain complex logic:

- `db.drizzle.js` - Drizzle ORM database connection
- `betterAuth.js` - Better Auth configuration and setup
- `rbac.js` - Role-Based Access Control definitions
- `casl.js` - CASL authorization rules
- `abac.js` - Attribute-Based Access Control rules
- `rateLimit.config.js` - Rate limiting middleware
- `logging.config.js` - Winston logger configuration

These files should import from the consolidated config:

```javascript
// db.drizzle.js
import config from './index.js';

const pool = {
  max: config.database.pool.max,
  // ...
};
```

## Legacy Config Files

The following files are legacy Laravel-style configurations and may be removed in a future cleanup:

- `app.config.js` - Superseded by `config.app`
- `auth.config.js` - Superseded by `config.auth`
- `database.config.js` - Superseded by `config.database`
- `cors.config.js` - Superseded by `config.cors`
- `cache.config.js` - Superseded by `config.cache`
- `queue.config.js` - Superseded by `config.queue`
- `mail.config.js` - Superseded by `config.mail`
- `session.config.js` - Superseded by `config.auth.session`
- `hashing.config.js` - Legacy, not actively used
- `filesystems.config.js` - Superseded by `config.filesystems`
- `broadcasting.config.js` - Legacy, not actively used
- `permission.config.js` - Superseded by `config.auth`
- `sanctum.config.js` - Legacy Laravel Sanctum config
- `services.config.js` - Legacy, not actively used
- `view.config.js` - Legacy, not actively used

## Testing

Run the configuration tests:

```bash
NODE_OPTIONS="--experimental-vm-modules" npm test -- tests/config/index.test.js
```

All 20 tests should pass:

```
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

## Best Practices

1. **Always use the consolidated config** - Import from `config/index.js` instead of reading `process.env` directly
2. **Use type-safe helpers** - Use `envBool()` and `envInt()` instead of manual parsing
3. **Validate early** - The config validates on load, so errors are caught at startup
4. **Use defaults** - Provide sensible defaults for optional configuration
5. **Document new config** - Add new configuration to this README when adding new settings
6. **Test in all environments** - Ensure configuration works in development, test, and production

## Support

For questions or issues with the configuration system, please refer to:

- This README
- The test file: `tests/config/index.test.js`
- The source code: `src/config/index.js`
- Ticket #018 in the IMPLEMENTATION_TICKETS.md file
