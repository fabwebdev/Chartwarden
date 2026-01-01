import { db } from '../db/index.js';
import { admin_settings, admin_settings_history } from '../db/schemas/adminSettings.schema.js';
import { clearinghouse_configurations } from '../db/schemas/clearinghouse.schema.js';
import { eq, sql, and, desc, asc, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * System Settings Controller
 * Admin-only endpoint for managing system-wide configuration settings
 *
 * Features:
 *   - System configuration management (CRUD)
 *   - Clearinghouse integration settings
 *   - Settings history/audit trail
 *   - Connection testing for clearinghouse
 *   - Encrypted credential storage
 *
 * Endpoints:
 * - GET /api/admin/settings - List all settings by category
 * - GET /api/admin/settings/:key - Get setting by key
 * - PUT /api/admin/settings/:key - Update setting
 * - POST /api/admin/settings/bulk - Bulk update settings
 * - GET /api/admin/settings/history - Get settings change history
 * - POST /api/admin/settings/clearinghouse/test - Test clearinghouse connection
 * - POST /api/admin/settings/reset/:key - Reset setting to default
 */
class SystemSettingsController {

  // Encryption key should be in environment - using a default for development
  get encryptionKey() {
    return process.env.SETTINGS_ENCRYPTION_KEY || 'chartwarden-settings-encryption-key-32';
  }

  /**
   * Encrypt sensitive value
   * @private
   */
  encryptValue(value) {
    if (!value) return value;
    try {
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Error encrypting value:', error);
      return value;
    }
  }

  /**
   * Decrypt sensitive value
   * @private
   */
  decryptValue(encryptedValue) {
    if (!encryptedValue || !encryptedValue.includes(':')) return encryptedValue;
    try {
      const [ivHex, encrypted] = encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting value:', error);
      return encryptedValue;
    }
  }

  /**
   * Mask sensitive value for display
   * @private
   */
  maskValue(value) {
    if (!value) return value;
    if (value.length <= 4) return '****';
    return '*'.repeat(value.length - 4) + value.slice(-4);
  }

  /**
   * List all settings grouped by category
   * GET /api/admin/settings
   *
   * Query: category (optional)
   * Response: { success, data: { categories: { category: settings[] } } }
   */
  async listSettings(request, reply) {
    try {
      const { category } = request.query;

      let query = db.select().from(admin_settings);

      if (category) {
        query = query.where(eq(admin_settings.category, category.toUpperCase()));
      }

      const settings = await query.orderBy(
        asc(admin_settings.category),
        asc(admin_settings.display_order)
      );

      // Group by category and mask sensitive values
      const categories = {};
      for (const setting of settings) {
        const cat = setting.category;
        if (!categories[cat]) {
          categories[cat] = [];
        }

        // Mask sensitive values
        const settingData = { ...setting };
        if (setting.is_sensitive && setting.setting_value) {
          settingData.setting_value = this.maskValue(setting.setting_value);
          settingData.is_masked = true;
        }

        categories[cat].push(settingData);
      }

      return reply.code(200).send({
        success: true,
        data: {
          categories,
          total_count: settings.length
        }
      });
    } catch (error) {
      logger.error('Error listing settings:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get setting by key
   * GET /api/admin/settings/:key
   *
   * Params: key (setting key)
   * Response: { success, data: setting }
   */
  async getSetting(request, reply) {
    try {
      const { key } = request.params;

      const [setting] = await db
        .select()
        .from(admin_settings)
        .where(eq(admin_settings.setting_key, key))
        .limit(1);

      if (!setting) {
        return reply.code(404).send({
          success: false,
          error: `Setting "${key}" not found`
        });
      }

      // Mask sensitive value
      const settingData = { ...setting };
      if (setting.is_sensitive && setting.setting_value) {
        settingData.setting_value = this.maskValue(setting.setting_value);
        settingData.is_masked = true;
      }

      return reply.code(200).send({
        success: true,
        data: settingData
      });
    } catch (error) {
      logger.error('Error getting setting:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update setting
   * PUT /api/admin/settings/:key
   *
   * Params: key (setting key)
   * Body: { value, reason }
   * Response: { success, message, data: setting }
   */
  async updateSetting(request, reply) {
    try {
      const { key } = request.params;
      const { value, reason } = request.body;

      // Get existing setting
      const [existing] = await db
        .select()
        .from(admin_settings)
        .where(eq(admin_settings.setting_key, key))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({
          success: false,
          error: `Setting "${key}" not found`
        });
      }

      if (existing.is_readonly) {
        return reply.code(403).send({
          success: false,
          error: `Setting "${key}" is read-only and cannot be modified`
        });
      }

      // Validate value based on type
      const validationError = this.validateValue(value, existing);
      if (validationError) {
        return reply.code(400).send({
          success: false,
          error: validationError
        });
      }

      // Encrypt if sensitive
      let newValue = value;
      if (existing.is_sensitive && value) {
        newValue = this.encryptValue(value);
      }

      // Update setting
      const [updated] = await db
        .update(admin_settings)
        .set({
          setting_value: newValue?.toString(),
          updated_by_id: request.user?.id,
          updated_at: new Date()
        })
        .where(eq(admin_settings.id, existing.id))
        .returning();

      // Record history
      await db.insert(admin_settings_history).values({
        setting_id: existing.id,
        setting_key: key,
        previous_value: existing.is_sensitive ? '[ENCRYPTED]' : existing.setting_value,
        new_value: existing.is_sensitive ? '[ENCRYPTED]' : newValue?.toString(),
        change_reason: reason,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        session_id: request.session?.id,
        changed_by_id: request.user?.id
      });

      logger.info(`Setting "${key}" updated by user ${request.user?.id}`);

      // Mask response if sensitive
      const responseData = { ...updated };
      if (existing.is_sensitive) {
        responseData.setting_value = this.maskValue(value);
        responseData.is_masked = true;
      }

      return reply.code(200).send({
        success: true,
        message: `Setting "${key}" updated successfully`,
        data: responseData,
        requires_restart: existing.requires_restart
      });
    } catch (error) {
      logger.error('Error updating setting:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Bulk update multiple settings
   * POST /api/admin/settings/bulk
   *
   * Body: { settings: [{ key, value }], reason }
   * Response: { success, message, updated_count, errors }
   */
  async bulkUpdateSettings(request, reply) {
    try {
      const { settings, reason } = request.body;

      if (!settings || !Array.isArray(settings)) {
        return reply.code(400).send({
          success: false,
          error: 'settings array is required'
        });
      }

      const results = {
        updated: [],
        errors: []
      };

      for (const item of settings) {
        try {
          // Get existing setting
          const [existing] = await db
            .select()
            .from(admin_settings)
            .where(eq(admin_settings.setting_key, item.key))
            .limit(1);

          if (!existing) {
            results.errors.push({ key: item.key, error: 'Setting not found' });
            continue;
          }

          if (existing.is_readonly) {
            results.errors.push({ key: item.key, error: 'Setting is read-only' });
            continue;
          }

          // Validate
          const validationError = this.validateValue(item.value, existing);
          if (validationError) {
            results.errors.push({ key: item.key, error: validationError });
            continue;
          }

          // Encrypt if sensitive
          let newValue = item.value;
          if (existing.is_sensitive && item.value) {
            newValue = this.encryptValue(item.value);
          }

          // Update
          await db
            .update(admin_settings)
            .set({
              setting_value: newValue?.toString(),
              updated_by_id: request.user?.id,
              updated_at: new Date()
            })
            .where(eq(admin_settings.id, existing.id));

          // Record history
          await db.insert(admin_settings_history).values({
            setting_id: existing.id,
            setting_key: item.key,
            previous_value: existing.is_sensitive ? '[ENCRYPTED]' : existing.setting_value,
            new_value: existing.is_sensitive ? '[ENCRYPTED]' : newValue?.toString(),
            change_reason: reason,
            ip_address: request.ip,
            user_agent: request.headers['user-agent'],
            session_id: request.session?.id,
            changed_by_id: request.user?.id
          });

          results.updated.push(item.key);
        } catch (error) {
          results.errors.push({ key: item.key, error: error.message });
        }
      }

      logger.info(`Bulk settings update by user ${request.user?.id}: ${results.updated.length} updated, ${results.errors.length} errors`);

      return reply.code(200).send({
        success: true,
        message: `${results.updated.length} settings updated successfully`,
        updated_count: results.updated.length,
        updated_keys: results.updated,
        errors: results.errors
      });
    } catch (error) {
      logger.error('Error bulk updating settings:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get settings change history
   * GET /api/admin/settings/history
   *
   * Query: key (optional), limit (default 50), offset (default 0)
   * Response: { success, data: history[] }
   */
  async getSettingsHistory(request, reply) {
    try {
      const { key, limit = 50, offset = 0 } = request.query;

      let query = db.select().from(admin_settings_history);

      if (key) {
        query = query.where(eq(admin_settings_history.setting_key, key));
      }

      const history = await query
        .orderBy(desc(admin_settings_history.changed_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      return reply.code(200).send({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      logger.error('Error getting settings history:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reset setting to default value
   * POST /api/admin/settings/reset/:key
   *
   * Params: key (setting key)
   * Response: { success, message, data: setting }
   */
  async resetSetting(request, reply) {
    try {
      const { key } = request.params;
      const { reason } = request.body;

      // Get existing setting
      const [existing] = await db
        .select()
        .from(admin_settings)
        .where(eq(admin_settings.setting_key, key))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({
          success: false,
          error: `Setting "${key}" not found`
        });
      }

      if (existing.is_readonly) {
        return reply.code(403).send({
          success: false,
          error: `Setting "${key}" is read-only`
        });
      }

      // Reset to default
      const [updated] = await db
        .update(admin_settings)
        .set({
          setting_value: existing.default_value,
          updated_by_id: request.user?.id,
          updated_at: new Date()
        })
        .where(eq(admin_settings.id, existing.id))
        .returning();

      // Record history
      await db.insert(admin_settings_history).values({
        setting_id: existing.id,
        setting_key: key,
        previous_value: existing.is_sensitive ? '[ENCRYPTED]' : existing.setting_value,
        new_value: existing.is_sensitive ? '[ENCRYPTED]' : existing.default_value,
        change_reason: reason || 'Reset to default value',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        session_id: request.session?.id,
        changed_by_id: request.user?.id
      });

      logger.info(`Setting "${key}" reset to default by user ${request.user?.id}`);

      return reply.code(200).send({
        success: true,
        message: `Setting "${key}" reset to default successfully`,
        data: updated
      });
    } catch (error) {
      logger.error('Error resetting setting:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Test clearinghouse connection
   * POST /api/admin/settings/clearinghouse/test
   *
   * Body: { api_endpoint, username, password, connection_timeout }
   * Response: { success, message, connection_details }
   */
  async testClearinghouseConnection(request, reply) {
    try {
      const { api_endpoint, username, password, connection_timeout = 30000 } = request.body;

      if (!api_endpoint) {
        return reply.code(400).send({
          success: false,
          error: 'API endpoint is required for connection test'
        });
      }

      // Validate URL format
      try {
        new URL(api_endpoint);
      } catch {
        return reply.code(400).send({
          success: false,
          error: 'Invalid API endpoint URL format'
        });
      }

      const startTime = Date.now();

      // Simulate connection test (in production, this would actually connect)
      // For now, we'll do a basic HTTP check
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), connection_timeout);

        const response = await fetch(api_endpoint, {
          method: 'HEAD',
          signal: controller.signal,
          headers: username && password ? {
            'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
          } : {}
        });

        clearTimeout(timeoutId);

        const responseTime = Date.now() - startTime;

        if (response.ok || response.status === 401 || response.status === 403) {
          // 401/403 means the endpoint is reachable but needs auth
          return reply.code(200).send({
            success: true,
            message: 'Connection test successful',
            connection_details: {
              status: response.status,
              status_text: response.statusText,
              response_time_ms: responseTime,
              endpoint: api_endpoint,
              reachable: true,
              auth_required: response.status === 401 || response.status === 403
            }
          });
        } else {
          return reply.code(200).send({
            success: false,
            message: `Connection failed with status ${response.status}`,
            connection_details: {
              status: response.status,
              status_text: response.statusText,
              response_time_ms: responseTime,
              endpoint: api_endpoint,
              reachable: true,
              error: `Server returned status ${response.status}`
            }
          });
        }
      } catch (fetchError) {
        const responseTime = Date.now() - startTime;

        if (fetchError.name === 'AbortError') {
          return reply.code(200).send({
            success: false,
            message: 'Connection timeout',
            connection_details: {
              endpoint: api_endpoint,
              reachable: false,
              response_time_ms: responseTime,
              error: `Connection timed out after ${connection_timeout}ms`
            }
          });
        }

        return reply.code(200).send({
          success: false,
          message: 'Connection failed',
          connection_details: {
            endpoint: api_endpoint,
            reachable: false,
            response_time_ms: responseTime,
            error: fetchError.message
          }
        });
      }
    } catch (error) {
      logger.error('Error testing clearinghouse connection:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Initialize default settings (for first-time setup)
   * POST /api/admin/settings/initialize
   *
   * Response: { success, message, created_count }
   */
  async initializeSettings(request, reply) {
    try {
      // Check if settings already exist
      const [existingCount] = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(admin_settings);

      if (existingCount.count > 0) {
        return reply.code(200).send({
          success: true,
          message: 'Settings already initialized',
          existing_count: existingCount.count
        });
      }

      const defaultSettings = [
        // System Configuration
        {
          setting_key: 'system.timezone',
          name: 'System Timezone',
          description: 'Default timezone for the application',
          setting_value: 'America/New_York',
          default_value: 'America/New_York',
          setting_type: 'SELECT',
          category: 'SYSTEM',
          options: JSON.stringify([
            { value: 'America/New_York', label: 'Eastern Time (ET)' },
            { value: 'America/Chicago', label: 'Central Time (CT)' },
            { value: 'America/Denver', label: 'Mountain Time (MT)' },
            { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
            { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
            { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
            { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
          ]),
          display_order: 1
        },
        {
          setting_key: 'system.date_format',
          name: 'Date Format',
          description: 'Default date format for display',
          setting_value: 'MM/DD/YYYY',
          default_value: 'MM/DD/YYYY',
          setting_type: 'SELECT',
          category: 'SYSTEM',
          options: JSON.stringify([
            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
          ]),
          display_order: 2
        },
        {
          setting_key: 'system.maintenance_mode',
          name: 'Maintenance Mode',
          description: 'Enable to put the system in maintenance mode',
          setting_value: 'false',
          default_value: 'false',
          setting_type: 'BOOLEAN',
          category: 'SYSTEM',
          display_order: 3
        },

        // Security Settings
        {
          setting_key: 'security.session_timeout',
          name: 'Session Timeout (minutes)',
          description: 'Duration in minutes before inactive sessions expire',
          setting_value: '30',
          default_value: '30',
          setting_type: 'INTEGER',
          category: 'SECURITY',
          validation_rules: JSON.stringify({ min: 5, max: 480 }),
          display_order: 1
        },
        {
          setting_key: 'security.max_login_attempts',
          name: 'Max Login Attempts',
          description: 'Maximum failed login attempts before account lockout',
          setting_value: '5',
          default_value: '5',
          setting_type: 'INTEGER',
          category: 'SECURITY',
          validation_rules: JSON.stringify({ min: 3, max: 10 }),
          display_order: 2
        },
        {
          setting_key: 'security.password_expiry_days',
          name: 'Password Expiry (days)',
          description: 'Number of days before password must be changed (0 = never)',
          setting_value: '90',
          default_value: '90',
          setting_type: 'INTEGER',
          category: 'SECURITY',
          validation_rules: JSON.stringify({ min: 0, max: 365 }),
          display_order: 3
        },

        // Clearinghouse Settings
        {
          setting_key: 'clearinghouse.enabled',
          name: 'Enable Clearinghouse Integration',
          description: 'Enable or disable clearinghouse integration',
          setting_value: 'false',
          default_value: 'false',
          setting_type: 'BOOLEAN',
          category: 'CLEARINGHOUSE',
          display_order: 1
        },
        {
          setting_key: 'clearinghouse.api_endpoint',
          name: 'API Endpoint URL',
          description: 'Clearinghouse API endpoint URL',
          setting_value: '',
          default_value: '',
          setting_type: 'URL',
          category: 'CLEARINGHOUSE',
          display_order: 2
        },
        {
          setting_key: 'clearinghouse.username',
          name: 'API Username',
          description: 'Username for clearinghouse API authentication',
          setting_value: '',
          default_value: '',
          setting_type: 'STRING',
          category: 'CLEARINGHOUSE',
          display_order: 3
        },
        {
          setting_key: 'clearinghouse.password',
          name: 'API Password',
          description: 'Password for clearinghouse API authentication',
          setting_value: '',
          default_value: '',
          setting_type: 'ENCRYPTED',
          category: 'CLEARINGHOUSE',
          is_sensitive: true,
          display_order: 4
        },
        {
          setting_key: 'clearinghouse.sync_frequency',
          name: 'Sync Frequency',
          description: 'How often to sync with the clearinghouse',
          setting_value: '60',
          default_value: '60',
          setting_type: 'SELECT',
          category: 'CLEARINGHOUSE',
          options: JSON.stringify([
            { value: '15', label: 'Every 15 minutes' },
            { value: '30', label: 'Every 30 minutes' },
            { value: '60', label: 'Every hour' },
            { value: '120', label: 'Every 2 hours' },
            { value: '360', label: 'Every 6 hours' },
            { value: '1440', label: 'Once daily' }
          ]),
          display_order: 5
        },
        {
          setting_key: 'clearinghouse.connection_timeout',
          name: 'Connection Timeout (seconds)',
          description: 'Timeout for clearinghouse API connections',
          setting_value: '30',
          default_value: '30',
          setting_type: 'INTEGER',
          category: 'CLEARINGHOUSE',
          validation_rules: JSON.stringify({ min: 5, max: 120 }),
          display_order: 6
        }
      ];

      // Insert default settings
      await db.insert(admin_settings).values(
        defaultSettings.map(s => ({
          ...s,
          options: s.options ? JSON.parse(s.options) : null,
          validation_rules: s.validation_rules ? JSON.parse(s.validation_rules) : null,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        }))
      );

      logger.info(`Settings initialized by user ${request.user?.id}: ${defaultSettings.length} settings created`);

      return reply.code(201).send({
        success: true,
        message: 'Settings initialized successfully',
        created_count: defaultSettings.length
      });
    } catch (error) {
      logger.error('Error initializing settings:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate setting value based on type
   * @private
   */
  validateValue(value, setting) {
    const { setting_type, validation_rules } = setting;
    const rules = validation_rules || {};

    switch (setting_type) {
      case 'INTEGER':
        const num = parseInt(value);
        if (isNaN(num)) return 'Value must be a valid integer';
        if (rules.min !== undefined && num < rules.min) return `Value must be at least ${rules.min}`;
        if (rules.max !== undefined && num > rules.max) return `Value must be at most ${rules.max}`;
        break;

      case 'BOOLEAN':
        if (!['true', 'false', true, false].includes(value)) {
          return 'Value must be true or false';
        }
        break;

      case 'URL':
        if (value) {
          try {
            new URL(value);
          } catch {
            return 'Value must be a valid URL';
          }
        }
        break;

      case 'EMAIL':
        if (value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Value must be a valid email address';
          }
        }
        break;

      case 'SELECT':
        if (value && setting.options) {
          const validValues = setting.options.map(o => o.value);
          if (!validValues.includes(value)) {
            return `Value must be one of: ${validValues.join(', ')}`;
          }
        }
        break;

      case 'JSON':
        if (value) {
          try {
            JSON.parse(value);
          } catch {
            return 'Value must be valid JSON';
          }
        }
        break;
    }

    if (rules.required && !value) {
      return 'Value is required';
    }

    if (rules.pattern && value) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return `Value does not match required pattern`;
      }
    }

    return null;
  }
}

// Export singleton instance
export default new SystemSettingsController();
