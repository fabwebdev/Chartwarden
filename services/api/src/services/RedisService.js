/**
 * Redis Service
 *
 * Provides Redis 7 client for session storage, caching, and real-time features
 * with connection pooling and comprehensive error handling.
 *
 * Features:
 * - Connection pooling via ioredis Cluster/Sentinel support
 * - Automatic reconnection with exponential backoff
 * - Health checks and connection monitoring
 * - Graceful shutdown support
 * - HIPAA-compliant logging (no sensitive data in logs)
 */

import fs from 'fs';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

// Redis client instance (lazy loaded)
let redisClient = null;
let isConnecting = false;
let connectionPromise = null;

// Connection state tracking
const connectionState = {
  isConnected: false,
  lastError: null,
  reconnectAttempts: 0,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
};

/**
 * Build TLS configuration for Redis
 *
 * HIPAA Requirement: 164.312(e)(2)(ii) - Encryption in transit
 * TLS is enabled by default in production unless explicitly disabled
 */
function buildRedisTLSConfig() {
  // TLS is enabled by default in production
  const tlsEnabled = isProduction
    ? process.env.REDIS_TLS !== 'false' // Default to true in production
    : process.env.REDIS_TLS === 'true'; // Default to false in development

  if (!tlsEnabled) {
    if (isProduction) {
      logger.warn(
        'SECURITY WARNING: Redis TLS is disabled in production. ' +
        'Set REDIS_TLS=true and provide certificates for encrypted connections.'
      );
    }
    return undefined;
  }

  const tlsConfig = {
    // Verify server certificate by default
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',

    // Minimum TLS version
    minVersion: 'TLSv1.2',
  };

  // Load CA certificate if provided
  if (process.env.REDIS_TLS_CA) {
    try {
      tlsConfig.ca = fs.readFileSync(process.env.REDIS_TLS_CA);
      logger.info('Loaded Redis CA certificate');
    } catch (err) {
      logger.error('Failed to load Redis CA certificate', { error: err.message });
    }
  }

  // Load client certificate for mTLS
  if (process.env.REDIS_TLS_CERT && process.env.REDIS_TLS_KEY) {
    try {
      tlsConfig.cert = fs.readFileSync(process.env.REDIS_TLS_CERT);
      tlsConfig.key = fs.readFileSync(process.env.REDIS_TLS_KEY);
      logger.info('Loaded Redis client certificate for mTLS');
    } catch (err) {
      logger.error('Failed to load Redis client certificates', { error: err.message });
    }
  }

  return tlsConfig;
}

// Configuration with defaults
const redisConfig = {
  host: config.cache.redis.host || '127.0.0.1',
  port: config.cache.redis.port || 6379,
  password: config.cache.redis.password || undefined,
  db: config.cache.redis.database || 0,
  keyPrefix: config.cache.redis.keyPrefix || 'hospice_ehr:',

  // Connection options
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Reconnection options
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,

  // Keep-alive
  keepAlive: 30000,

  // TLS configuration - enabled by default in production
  tls: buildRedisTLSConfig(),
};

/**
 * Initialize Redis client with ioredis
 * Uses lazy loading - client is created on first use
 * @returns {Promise<Object>} Redis client instance
 */
async function getClient() {
  // Return existing client if connected
  if (redisClient && connectionState.isConnected) {
    return redisClient;
  }

  // Return pending connection promise if connecting
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  isConnecting = true;
  connectionPromise = createClient();

  try {
    redisClient = await connectionPromise;
    return redisClient;
  } finally {
    isConnecting = false;
    connectionPromise = null;
  }
}

/**
 * Create a new Redis client with error handling
 * @returns {Promise<Object>} Redis client instance
 */
async function createClient() {
  try {
    // Dynamic import to handle case where ioredis is not installed
    const Redis = (await import('ioredis')).default;

    const client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout,
      maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
      enableReadyCheck: redisConfig.enableReadyCheck,
      keepAlive: redisConfig.keepAlive,
      tls: redisConfig.tls,

      // Reconnection strategy with exponential backoff
      retryStrategy(times) {
        connectionState.reconnectAttempts = times;

        if (times > 10) {
          logger.error('Redis: Max reconnection attempts reached', {
            attempts: times,
          });
          return null; // Stop retrying
        }

        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, ... max 30s
        const delay = Math.min(Math.pow(2, times) * 100, 30000);
        logger.warn('Redis: Reconnecting...', {
          attempt: times,
          delayMs: delay,
        });
        return delay;
      },

      // Lazy connect - don't connect until first command
      lazyConnect: false,
    });

    // Set up event handlers
    setupEventHandlers(client);

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, redisConfig.connectTimeout);

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    logger.info('Redis: Connected successfully', {
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
    });

    return client;
  } catch (error) {
    connectionState.lastError = error.message;
    logger.error('Redis: Failed to connect', {
      error: error.message,
      host: redisConfig.host,
      port: redisConfig.port,
    });
    throw error;
  }
}

/**
 * Set up Redis client event handlers
 * @param {Object} client - Redis client instance
 */
function setupEventHandlers(client) {
  client.on('connect', () => {
    logger.debug('Redis: Connecting...');
  });

  client.on('ready', () => {
    connectionState.isConnected = true;
    connectionState.lastConnectedAt = new Date();
    connectionState.reconnectAttempts = 0;
    connectionState.lastError = null;
    logger.info('Redis: Ready to accept commands');
  });

  client.on('error', (error) => {
    connectionState.lastError = error.message;
    // Don't log ECONNREFUSED repeatedly during reconnection
    if (!error.message.includes('ECONNREFUSED')) {
      logger.error('Redis: Error', { error: error.message });
    }
  });

  client.on('close', () => {
    connectionState.isConnected = false;
    connectionState.lastDisconnectedAt = new Date();
    logger.warn('Redis: Connection closed');
  });

  client.on('reconnecting', (delay) => {
    logger.debug('Redis: Reconnecting', { delayMs: delay });
  });

  client.on('end', () => {
    connectionState.isConnected = false;
    logger.info('Redis: Connection ended');
  });
}

/**
 * Redis Service class providing caching and session operations
 */
class RedisService {
  constructor() {
    this.defaultTTL = config.cache.ttl || 3600; // 1 hour default
  }

  /**
   * Get the underlying Redis client
   * @returns {Promise<Object>} Redis client
   */
  async getClient() {
    return getClient();
  }

  /**
   * Check if Redis is connected and available
   * @returns {Promise<boolean>} Connection status
   */
  async isConnected() {
    try {
      const client = await this.getClient();
      const pong = await client.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get connection state information
   * @returns {Object} Connection state
   */
  getConnectionState() {
    return { ...connectionState };
  }

  /**
   * Perform health check
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      const client = await this.getClient();
      await client.ping();

      const info = await client.info('server');
      const memoryInfo = await client.info('memory');

      // Parse Redis version from info
      const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
      const usedMemoryMatch = memoryInfo.match(/used_memory_human:(\S+)/);

      return {
        status: 'healthy',
        latencyMs: Date.now() - startTime,
        connected: true,
        version: versionMatch ? versionMatch[1] : 'unknown',
        usedMemory: usedMemoryMatch ? usedMemoryMatch[1] : 'unknown',
        connectionState: this.getConnectionState(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        connected: false,
        error: error.message,
        connectionState: this.getConnectionState(),
      };
    }
  }

  // ==================== Cache Operations ====================

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      const client = await this.getClient();
      const value = await client.get(key);

      if (value === null) {
        return null;
      }

      // Try to parse JSON, return raw string if parsing fails
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis: GET failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = await this.getClient();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl > 0) {
        await client.setex(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error('Redis: SET failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      const client = await this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis: DEL failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., "user:*")
   * @returns {Promise<number>} Number of deleted keys
   */
  async delPattern(pattern) {
    try {
      const client = await this.getClient();
      // Use SCAN to find keys (safer than KEYS for production)
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [newCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = newCursor;

        if (keys.length > 0) {
          // Remove prefix from keys since ioredis adds it automatically
          const keysWithoutPrefix = keys.map(k =>
            k.startsWith(redisConfig.keyPrefix)
              ? k.slice(redisConfig.keyPrefix.length)
              : k
          );
          await client.del(...keysWithoutPrefix);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      logger.error('Redis: DEL pattern failed', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if a key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis: EXISTS failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set expiration on a key
   * @param {string} key - Cache key
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<boolean>} Success status
   */
  async expire(key, ttl) {
    try {
      const client = await this.getClient();
      const result = await client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error('Redis: EXPIRE failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get TTL of a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if key doesn't exist)
   */
  async ttl(key) {
    try {
      const client = await this.getClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error('Redis: TTL failed', { key, error: error.message });
      return -2;
    }
  }

  /**
   * Increment a numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to increment (default 1)
   * @returns {Promise<number|null>} New value or null on error
   */
  async incr(key, amount = 1) {
    try {
      const client = await this.getClient();
      if (amount === 1) {
        return await client.incr(key);
      }
      return await client.incrby(key, amount);
    } catch (error) {
      logger.error('Redis: INCR failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Decrement a numeric value
   * @param {string} key - Cache key
   * @param {number} amount - Amount to decrement (default 1)
   * @returns {Promise<number|null>} New value or null on error
   */
  async decr(key, amount = 1) {
    try {
      const client = await this.getClient();
      if (amount === 1) {
        return await client.decr(key);
      }
      return await client.decrby(key, amount);
    } catch (error) {
      logger.error('Redis: DECR failed', { key, error: error.message });
      return null;
    }
  }

  // ==================== Hash Operations ====================

  /**
   * Set hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {Promise<boolean>} Success status
   */
  async hset(key, field, value) {
    try {
      const client = await this.getClient();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      await client.hset(key, field, serialized);
      return true;
    } catch (error) {
      logger.error('Redis: HSET failed', { key, field, error: error.message });
      return false;
    }
  }

  /**
   * Get hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @returns {Promise<any>} Field value or null
   */
  async hget(key, field) {
    try {
      const client = await this.getClient();
      const value = await client.hget(key, field);

      if (value === null) {
        return null;
      }

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis: HGET failed', { key, field, error: error.message });
      return null;
    }
  }

  /**
   * Get all hash fields
   * @param {string} key - Hash key
   * @returns {Promise<Object|null>} Hash object or null
   */
  async hgetall(key) {
    try {
      const client = await this.getClient();
      const hash = await client.hgetall(key);

      if (!hash || Object.keys(hash).length === 0) {
        return null;
      }

      // Try to parse JSON values
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }

      return result;
    } catch (error) {
      logger.error('Redis: HGETALL failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Delete hash field
   * @param {string} key - Hash key
   * @param {string} field - Field name
   * @returns {Promise<boolean>} Success status
   */
  async hdel(key, field) {
    try {
      const client = await this.getClient();
      await client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Redis: HDEL failed', { key, field, error: error.message });
      return false;
    }
  }

  // ==================== List Operations ====================

  /**
   * Push to list (right side)
   * @param {string} key - List key
   * @param {any} value - Value to push
   * @returns {Promise<number|null>} List length or null on error
   */
  async rpush(key, value) {
    try {
      const client = await this.getClient();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      return await client.rpush(key, serialized);
    } catch (error) {
      logger.error('Redis: RPUSH failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Push to list (left side)
   * @param {string} key - List key
   * @param {any} value - Value to push
   * @returns {Promise<number|null>} List length or null on error
   */
  async lpush(key, value) {
    try {
      const client = await this.getClient();
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      return await client.lpush(key, serialized);
    } catch (error) {
      logger.error('Redis: LPUSH failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Get list range
   * @param {string} key - List key
   * @param {number} start - Start index
   * @param {number} stop - Stop index
   * @returns {Promise<Array|null>} List elements or null on error
   */
  async lrange(key, start = 0, stop = -1) {
    try {
      const client = await this.getClient();
      const values = await client.lrange(key, start, stop);

      return values.map(value => {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Redis: LRANGE failed', { key, error: error.message });
      return null;
    }
  }

  // ==================== Set Operations ====================

  /**
   * Add to set
   * @param {string} key - Set key
   * @param {any} member - Member to add
   * @returns {Promise<boolean>} Success status
   */
  async sadd(key, member) {
    try {
      const client = await this.getClient();
      const serialized = typeof member === 'string' ? member : JSON.stringify(member);
      await client.sadd(key, serialized);
      return true;
    } catch (error) {
      logger.error('Redis: SADD failed', { key, error: error.message });
      return false;
    }
  }

  /**
   * Get all set members
   * @param {string} key - Set key
   * @returns {Promise<Array|null>} Set members or null on error
   */
  async smembers(key) {
    try {
      const client = await this.getClient();
      const members = await client.smembers(key);

      return members.map(member => {
        try {
          return JSON.parse(member);
        } catch {
          return member;
        }
      });
    } catch (error) {
      logger.error('Redis: SMEMBERS failed', { key, error: error.message });
      return null;
    }
  }

  /**
   * Check if member exists in set
   * @param {string} key - Set key
   * @param {any} member - Member to check
   * @returns {Promise<boolean>} Exists status
   */
  async sismember(key, member) {
    try {
      const client = await this.getClient();
      const serialized = typeof member === 'string' ? member : JSON.stringify(member);
      const result = await client.sismember(key, serialized);
      return result === 1;
    } catch (error) {
      logger.error('Redis: SISMEMBER failed', { key, error: error.message });
      return false;
    }
  }

  // ==================== Pub/Sub Operations ====================

  /**
   * Publish message to channel
   * @param {string} channel - Channel name
   * @param {any} message - Message to publish
   * @returns {Promise<number|null>} Number of subscribers or null on error
   */
  async publish(channel, message) {
    try {
      const client = await this.getClient();
      const serialized = typeof message === 'string' ? message : JSON.stringify(message);
      return await client.publish(channel, serialized);
    } catch (error) {
      logger.error('Redis: PUBLISH failed', { channel, error: error.message });
      return null;
    }
  }

  /**
   * Subscribe to channel
   * Note: Creates a dedicated subscriber connection
   * @param {string} channel - Channel name
   * @param {Function} callback - Message callback (channel, message) => void
   * @returns {Promise<Object>} Subscriber client for unsubscribing
   */
  async subscribe(channel, callback) {
    try {
      const Redis = (await import('ioredis')).default;

      // Create a dedicated subscriber client
      const subscriber = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        tls: redisConfig.tls,
      });

      subscriber.on('message', (ch, message) => {
        try {
          const parsed = JSON.parse(message);
          callback(ch, parsed);
        } catch {
          callback(ch, message);
        }
      });

      await subscriber.subscribe(channel);

      logger.info('Redis: Subscribed to channel', { channel });

      return subscriber;
    } catch (error) {
      logger.error('Redis: SUBSCRIBE failed', { channel, error: error.message });
      throw error;
    }
  }

  // ==================== Session Operations ====================

  /**
   * Store session data
   * @param {string} sessionId - Session ID
   * @param {Object} data - Session data
   * @param {number} ttl - Session TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async setSession(sessionId, data, ttl = config.auth.session.expiry) {
    const key = `session:${sessionId}`;
    return this.set(key, data, ttl);
  }

  /**
   * Get session data
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>} Session data or null
   */
  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.get(key);
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return this.del(key);
  }

  /**
   * Extend session TTL
   * @param {string} sessionId - Session ID
   * @param {number} ttl - New TTL in seconds
   * @returns {Promise<boolean>} Success status
   */
  async extendSession(sessionId, ttl = config.auth.session.expiry) {
    const key = `session:${sessionId}`;
    return this.expire(key, ttl);
  }

  // ==================== Rate Limiting ====================

  /**
   * Check and increment rate limit counter
   * @param {string} identifier - Rate limit identifier (e.g., IP or user ID)
   * @param {number} maxRequests - Max requests allowed
   * @param {number} windowSeconds - Time window in seconds
   * @returns {Promise<Object>} { allowed: boolean, remaining: number, resetIn: number }
   */
  async checkRateLimit(identifier, maxRequests = 100, windowSeconds = 60) {
    const key = `ratelimit:${identifier}`;

    try {
      const client = await this.getClient();

      // Get current count
      const current = await client.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await client.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetIn: ttl > 0 ? ttl : windowSeconds,
        };
      }

      // Increment counter
      const newCount = await client.incr(key);

      // Set expiry on first request
      if (newCount === 1) {
        await client.expire(key, windowSeconds);
      }

      const ttl = await client.ttl(key);

      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - newCount),
        resetIn: ttl > 0 ? ttl : windowSeconds,
      };
    } catch (error) {
      logger.error('Redis: Rate limit check failed', { identifier, error: error.message });
      // Fail open - allow request if Redis is unavailable
      return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
    }
  }

  // ==================== Utility Operations ====================

  /**
   * Flush all keys with the configured prefix
   * WARNING: Use with caution in production
   * @returns {Promise<number>} Number of deleted keys
   */
  async flushPrefix() {
    return this.delPattern('*');
  }

  /**
   * Get all keys matching a pattern
   * @param {string} pattern - Key pattern
   * @returns {Promise<Array>} Matching keys
   */
  async keys(pattern = '*') {
    try {
      const client = await this.getClient();
      const keys = [];
      let cursor = '0';

      do {
        const [newCursor, batch] = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = newCursor;
        keys.push(...batch);
      } while (cursor !== '0');

      return keys;
    } catch (error) {
      logger.error('Redis: KEYS failed', { pattern, error: error.message });
      return [];
    }
  }

  /**
   * Execute multiple commands in a pipeline
   * @param {Function} callback - Callback receiving pipeline instance
   * @returns {Promise<Array>} Pipeline results
   */
  async pipeline(callback) {
    try {
      const client = await this.getClient();
      const pipeline = client.pipeline();
      callback(pipeline);
      return await pipeline.exec();
    } catch (error) {
      logger.error('Redis: Pipeline failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute commands in a transaction
   * @param {Function} callback - Callback receiving multi instance
   * @returns {Promise<Array>} Transaction results
   */
  async transaction(callback) {
    try {
      const client = await this.getClient();
      const multi = client.multi();
      callback(multi);
      return await multi.exec();
    } catch (error) {
      logger.error('Redis: Transaction failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Gracefully close Redis connection
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (redisClient) {
      logger.info('Redis: Closing connection');
      await redisClient.quit();
      redisClient = null;
      connectionState.isConnected = false;
    }
  }
}

// Export singleton instance
const redisService = new RedisService();
export default redisService;
export { RedisService, redisConfig };
