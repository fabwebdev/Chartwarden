import NodeCache from 'node-cache';
import cacheConfig from '../config/cache.config.js';

import { logger } from '../utils/logger.js';

// Redis service will be lazy-loaded when needed
let redisService = null;

class CacheService {
    constructor() {
        this.cache = null;
        this.driver = cacheConfig.default;
        this.config = cacheConfig.stores[this.driver];
        this.prefix = cacheConfig.prefix;
        this.useRedis = false;

        this.init();
    }

    /**
     * Initialize the cache based on the configured driver
     */
    async init() {
        switch (this.driver) {
            case 'memory':
                this.cache = new NodeCache({
                    stdTTL: this.config.ttl,
                    maxKeys: this.config.max
                });
                break;

            case 'file':
                // File-based caching would require additional implementation
                logger.warn('File-based caching not yet implemented')
                this.cache = new NodeCache();
                break;

            case 'redis':
                try {
                    // Lazy load Redis service
                    const module = await import('./RedisService.js');
                    redisService = module.default;

                    // Test Redis connection
                    const isConnected = await redisService.isConnected();
                    if (isConnected) {
                        this.useRedis = true;
                        logger.info('CacheService: Using Redis driver');
                    } else {
                        logger.warn('CacheService: Redis not available, falling back to memory cache');
                        this.cache = new NodeCache({
                            stdTTL: this.config.ttl || 600,
                            maxKeys: 100
                        });
                    }
                } catch (error) {
                    logger.warn('CacheService: Redis driver failed to initialize, falling back to memory cache', {
                        error: error.message
                    });
                    this.cache = new NodeCache({
                        stdTTL: this.config.ttl || 600,
                        maxKeys: 100
                    });
                }
                break;

            case 'null':
            default:
                // No caching
                this.cache = {
                    set: () => false,
                    get: () => undefined,
                    del: () => false,
                    flushAll: () => {}
                };
                break;
        }
    }
    
    /**
     * Generate a prefixed cache key
     * @param {string} key - The cache key
     * @returns {string} The prefixed cache key
     */
    generateKey(key) {
        return `${this.prefix}:${key}`;
    }
    
    /**
     * Store an item in the cache
     * @param {string} key - The cache key
     * @param {*} value - The value to cache
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl) {
        const cacheKey = this.generateKey(key);

        if (this.useRedis && redisService) {
            return await redisService.set(cacheKey, value, ttl);
        }

        return this.cache.set(cacheKey, value, ttl);
    }

    /**
     * Retrieve an item from the cache
     * @param {string} key - The cache key
     * @returns {Promise<*>} The cached value or undefined/null
     */
    async get(key) {
        const cacheKey = this.generateKey(key);

        if (this.useRedis && redisService) {
            return await redisService.get(cacheKey);
        }

        return this.cache.get(cacheKey);
    }

    /**
     * Delete an item from the cache
     * @param {string} key - The cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        const cacheKey = this.generateKey(key);

        if (this.useRedis && redisService) {
            return await redisService.del(cacheKey);
        }

        return this.cache.del(cacheKey) > 0;
    }

    /**
     * Flush all cached items
     * @returns {Promise<boolean>} Success status
     */
    async flush() {
        if (this.useRedis && redisService) {
            const deleted = await redisService.flushPrefix();
            return deleted > 0;
        }

        this.cache.flushAll();
        return true;
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache statistics
     */
    async stats() {
        if (this.useRedis && redisService) {
            const healthCheck = await redisService.healthCheck();
            return {
                driver: 'redis',
                ...healthCheck
            };
        }

        if (this.cache.getStats) {
            return {
                driver: this.driver,
                ...this.cache.getStats()
            };
        }

        return { driver: this.driver };
    }

    /**
     * Check if cache key exists
     * @param {string} key - The cache key
     * @returns {Promise<boolean>} Exists status
     */
    async exists(key) {
        const cacheKey = this.generateKey(key);

        if (this.useRedis && redisService) {
            return await redisService.exists(cacheKey);
        }

        return this.cache.has(cacheKey);
    }

    /**
     * Get current driver name
     * @returns {string} Driver name
     */
    getDriver() {
        return this.useRedis ? 'redis' : this.driver;
    }
}

export default new CacheService();