#!/usr/bin/env node

/**
 * Secret Generator for EHR Backend
 *
 * Generates cryptographically secure random secrets for use in .env file
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *
 * SECURITY: Uses crypto.randomBytes() for cryptographically secure randomness
 */

import crypto from 'crypto';

console.log('\n🔐 Secure Secret Generator\n');
console.log('Copy these secrets to your .env file:\n');
console.log('─'.repeat(80));

// Generate JWT secret (64 bytes = 128 hex chars)
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('\n# JWT Configuration');
console.log(`JWT_SECRET=${jwtSecret}`);

// Generate Better Auth secret (64 bytes = 128 hex chars)
const betterAuthSecret = crypto.randomBytes(64).toString('hex');
console.log('\n# Better Auth Configuration');
console.log(`BETTER_AUTH_SECRET=${betterAuthSecret}`);

// Generate Admin Creation secret (64 bytes = 128 hex chars)
const adminSecret = crypto.randomBytes(64).toString('hex');
console.log('\n# Admin Creation Secret');
console.log(`ADMIN_CREATION_SECRET=${adminSecret}`);

console.log('\n' + '─'.repeat(80));
console.log('\n⚠️  IMPORTANT:');
console.log('  1. Copy these secrets to your .env file');
console.log('  2. NEVER commit .env to git');
console.log('  3. Store production secrets in a secure vault (AWS Secrets Manager, etc.)');
console.log('  4. Rotate secrets if they are ever exposed');
console.log('  5. After updating .env, restart your application\n');
