/**
 * Tests for Consolidated Configuration Module
 *
 * TICKET #018: Consolidate Configuration Files
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Configuration Module', () => {
  // Note: Due to ES module caching, we can't easily test different env configs
  // in the same process. These tests verify the loaded configuration structure
  // and behavior with the current environment.

  describe('Environment Helpers', () => {
    it('should have env helper function', async () => {
      const { env } = await import('../../src/config/index.js');

      expect(typeof env).toBe('function');
      expect(env('DATABASE_URL')).toBeDefined();
      expect(env('NONEXISTENT_VAR_XYZ', 'default')).toBe('default');
    });

    it('should have envBool helper function', async () => {
      const { envBool } = await import('../../src/config/index.js');

      expect(typeof envBool).toBe('function');
      // Test with a missing variable
      expect(envBool('NONEXISTENT_BOOL_VAR', true)).toBe(true);
      expect(envBool('NONEXISTENT_BOOL_VAR', false)).toBe(false);
    });

    it('should have envInt helper function', async () => {
      const { envInt } = await import('../../src/config/index.js');

      expect(typeof envInt).toBe('function');
      // Test with a missing variable
      expect(envInt('NONEXISTENT_INT_VAR', 42)).toBe(42);
    });

    it('should have required helper function', async () => {
      const { required } = await import('../../src/config/index.js');

      expect(typeof required).toBe('function');
      // Test that it throws for missing vars
      expect(() => required('NONEXISTENT_REQUIRED_VAR')).toThrow('CONFIGURATION ERROR');
    });
  });

  describe('Configuration Structure', () => {
    it('should load app configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.app).toBeDefined();
      expect(config.app.name).toBeDefined();
      expect(typeof config.app.port).toBe('number');
      expect(typeof config.app.debug).toBe('boolean');
      expect(config.app.env).toBeDefined();
    });

    it('should load database configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.database).toBeDefined();
      expect(config.database.url).toBeDefined();
      expect(config.database.pool).toBeDefined();
      expect(typeof config.database.pool.max).toBe('number');
      expect(typeof config.database.pool.min).toBe('number');
    });

    it('should load auth configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.auth).toBeDefined();
      expect(config.auth.jwt).toBeDefined();
      expect(config.auth.jwt.secret).toBeDefined();
      expect(config.auth.jwt.expiresIn).toBeDefined();
      expect(config.auth.session.expiry).toBeDefined();
    });

    it('should load CORS configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.cors).toBeDefined();
      expect(config.cors.origin).toBeDefined();
      expect(typeof config.cors.credentials).toBe('boolean');
      expect(Array.isArray(config.cors.methods)).toBe(true);
      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
    });

    it('should load logging configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.logging).toBeDefined();
      expect(config.logging.level).toBeDefined();
      expect(typeof config.logging.maxFiles).toBe('number');
    });

    it('should load mail configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.mail).toBeDefined();
      expect(config.mail.host).toBeDefined();
      expect(typeof config.mail.port).toBe('number');
      expect(config.mail.from).toBeDefined();
    });

    it('should load hospice-specific configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.hospice).toBeDefined();
      expect(config.hospice.cap).toBeDefined();
      expect(config.hospice.cap.alertEmail).toBeDefined();
      expect(typeof config.hospice.cap.yearAmountCents).toBe('number');
      expect(typeof config.hospice.scheduler.enabled).toBe('boolean');
    });
  });

  describe('Configuration Validation', () => {
    it('should have validation function', async () => {
      const { validateConfig } = await import('../../src/config/index.js');

      expect(typeof validateConfig).toBe('function');
      // Config is validated on load, so if we got here, it passed
      expect(() => validateConfig()).not.toThrow();
    });

    it('should successfully load in current environment', async () => {
      const config = (await import('../../src/config/index.js')).default;

      // If config loaded, validation passed
      expect(config).toBeDefined();
      expect(config.database.url).toBeDefined();
    });
  });

  describe('Helper Functions', () => {
    it('should get nested config values', async () => {
      const { get } = await import('../../src/config/index.js');

      expect(get('database.pool.max')).toBeDefined();
      expect(get('app.name')).toBeDefined();
      expect(get('invalid.path', 'default')).toBe('default');
    });

    it('should have environment detection functions', async () => {
      const { isProduction, isDevelopment, isTest } = await import('../../src/config/index.js');

      expect(typeof isProduction).toBe('function');
      expect(typeof isDevelopment).toBe('function');
      expect(typeof isTest).toBe('function');

      // One of these should be true based on current NODE_ENV
      const results = [isProduction(), isDevelopment(), isTest()];
      expect(results.some(r => r === true)).toBe(true);
    });
  });

  describe('Configuration Completeness', () => {
    it('should have complete app config structure', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.app).toBeDefined();
      expect(config.app.port).toBeDefined();
      expect(typeof config.app.port).toBe('number');
      expect(typeof config.app.debug).toBe('boolean');
      expect(config.app.timezone).toBeDefined();
      expect(config.app.locale).toBeDefined();
    });

    it('should have complete database pool configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.database.pool).toBeDefined();
      expect(typeof config.database.pool.max).toBe('number');
      expect(typeof config.database.pool.min).toBe('number');
      expect(config.database.pool.max).toBeGreaterThan(0);
      expect(config.database.pool.idleTimeoutMillis).toBeGreaterThan(0);
    });

    it('should have complete logging configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.logging).toBeDefined();
      expect(config.logging.level).toBeDefined();
      expect(config.logging.format).toBeDefined();
      expect(typeof config.logging.maxFiles).toBe('number');
    });

    it('should have complete CORS configuration', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.cors).toBeDefined();
      expect(config.cors.origin).toBeDefined();
      expect(typeof config.cors.credentials).toBe('boolean');
      expect(Array.isArray(config.cors.methods)).toBe(true);
      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
      expect(config.cors.methods).toContain('PUT');
      expect(config.cors.methods).toContain('DELETE');
    });

    it('should have all major config sections', async () => {
      const config = (await import('../../src/config/index.js')).default;

      expect(config.app).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.auth).toBeDefined();
      expect(config.cors).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.mail).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.queue).toBeDefined();
      expect(config.filesystems).toBeDefined();
      expect(config.hospice).toBeDefined();
      expect(config.services).toBeDefined();
      expect(config.features).toBeDefined();
      expect(config.debug).toBeDefined();
    });
  });
});
