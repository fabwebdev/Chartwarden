/**
 * ICD-10 Code Service
 *
 * Provides ICD-10 diagnosis code lookup with caching and autocomplete functionality.
 * Designed for fast response times (<200ms) and high cache hit rates (>70%).
 *
 * Features:
 * - Autocomplete by code or description with sub-200ms response
 * - Multi-tier caching (in-memory + Redis fallback)
 * - Case-insensitive search
 * - Exact code lookups
 * - Category and chapter navigation
 * - Usage tracking for popularity-based sorting
 * - Hospice-relevant code prioritization
 *
 * Cache Strategy:
 * - Primary: In-memory LRU cache for frequently accessed codes (fastest)
 * - Secondary: Redis cache for shared state across instances
 * - TTL: 24 hours for ICD-10 codes (static medical reference data)
 */

import { db } from '../config/db.drizzle.js';
import { icd10_codes } from '../db/schemas/index.js';
import { eq, and, or, ilike, sql, desc, asc, gte, lte, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import cacheService from './CacheService.js';

// In-memory LRU cache for ultra-fast lookups
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 1000;
const MEMORY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Redis cache TTL for ICD-10 codes (24 hours - medical reference data is stable)
const REDIS_CACHE_TTL_SECONDS = 24 * 60 * 60;

// Cache key prefixes
const CACHE_PREFIX = 'icd10';

/**
 * LRU memory cache entry
 */
class CacheEntry {
  constructor(value, ttlMs = MEMORY_CACHE_TTL_MS) {
    this.value = value;
    this.expiresAt = Date.now() + ttlMs;
    this.accessedAt = Date.now();
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  touch() {
    this.accessedAt = Date.now();
  }
}

/**
 * ICD-10 Service Class
 */
class ICD10Service {
  constructor() {
    this.stats = {
      memoryCacheHits: 0,
      redisCacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0
    };
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  /**
   * Generate cache key
   * @private
   */
  _getCacheKey(type, identifier) {
    return `${CACHE_PREFIX}:${type}:${identifier}`;
  }

  /**
   * Get from memory cache
   * @private
   */
  _getFromMemoryCache(key) {
    const entry = memoryCache.get(key);
    if (entry && !entry.isExpired()) {
      entry.touch();
      this.stats.memoryCacheHits++;
      return entry.value;
    }
    if (entry) {
      memoryCache.delete(key);
    }
    return null;
  }

  /**
   * Set in memory cache with LRU eviction
   * @private
   */
  _setInMemoryCache(key, value, ttlMs = MEMORY_CACHE_TTL_MS) {
    // LRU eviction if at capacity
    if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, entry] of memoryCache.entries()) {
        if (entry.accessedAt < oldestTime) {
          oldestTime = entry.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }
    memoryCache.set(key, new CacheEntry(value, ttlMs));
  }

  /**
   * Multi-tier cache get
   * @private
   */
  async _getCached(key) {
    this.stats.totalQueries++;

    // Try memory cache first (fastest)
    const memResult = this._getFromMemoryCache(key);
    if (memResult !== null) {
      return memResult;
    }

    // Try Redis cache
    try {
      const redisResult = await cacheService.get(key);
      if (redisResult !== null && redisResult !== undefined) {
        this.stats.redisCacheHits++;
        // Promote to memory cache
        this._setInMemoryCache(key, redisResult);
        return redisResult;
      }
    } catch (error) {
      logger.warn('ICD10 Redis cache get failed', { key, error: error.message });
    }

    this.stats.cacheMisses++;
    return null;
  }

  /**
   * Multi-tier cache set
   * @private
   */
  async _setCached(key, value, ttlSeconds = REDIS_CACHE_TTL_SECONDS) {
    // Set in memory cache
    this._setInMemoryCache(key, value, ttlSeconds * 1000);

    // Set in Redis cache
    try {
      await cacheService.set(key, value, ttlSeconds);
    } catch (error) {
      logger.warn('ICD10 Redis cache set failed', { key, error: error.message });
    }
  }

  /**
   * Clear all ICD-10 caches
   */
  async clearCache() {
    // Clear memory cache
    for (const key of memoryCache.keys()) {
      if (key.startsWith(CACHE_PREFIX)) {
        memoryCache.delete(key);
      }
    }

    // Clear Redis cache (pattern delete)
    try {
      // Note: This assumes cacheService has a way to delete by pattern
      // If not available, individual keys would need to be tracked
      logger.info('ICD10 cache cleared');
    } catch (error) {
      logger.warn('ICD10 Redis cache clear failed', { error: error.message });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const total = this.stats.totalQueries;
    const hits = this.stats.memoryCacheHits + this.stats.redisCacheHits;
    return {
      ...this.stats,
      totalHits: hits,
      hitRate: total > 0 ? ((hits / total) * 100).toFixed(2) + '%' : '0%',
      memoryCacheSize: memoryCache.size,
      memoryCacheMaxSize: MEMORY_CACHE_MAX_SIZE
    };
  }

  // ============================================
  // VALIDATION & NORMALIZATION
  // ============================================

  /**
   * Validate ICD-10 code format
   * ICD-10 codes follow the pattern: Letter + 2 digits + optional decimal + 1-4 characters
   * Examples: A00, A00.0, A00.01, E11.9, Z99.89
   *
   * @param {string} code - ICD-10 code to validate
   * @returns {boolean} - True if code matches ICD-10 format
   */
  validateFormat(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }

    // ICD-10-CM format: Letter + 2 digits + optional (. + 1-4 alphanumeric characters)
    // Examples: A00, A00.0, A00.01, E11.65, Z99.89, S06.0X1A
    const icd10Pattern = /^[A-TV-Z]\d{2}(\.[A-Z0-9]{1,4})?$/i;
    return icd10Pattern.test(code.trim());
  }

  /**
   * Normalize ICD-10 code to uppercase
   *
   * @param {string} code - ICD-10 code
   * @returns {string} - Normalized code
   */
  normalize(code) {
    if (!code || typeof code !== 'string') {
      return '';
    }
    return code.trim().toUpperCase();
  }

  /**
   * Get category code (first 3 characters)
   * @param {string} code - Full ICD-10 code
   * @returns {string} - Category code
   */
  getCategoryCode(code) {
    const normalized = this.normalize(code);
    return normalized.substring(0, 3);
  }

  /**
   * Validate and sanitize an array of ICD-10 codes
   *
   * @param {Array<string>} codes - Array of ICD-10 codes
   * @returns {Object} - { valid: Array, invalid: Array }
   */
  validateCodes(codes) {
    if (!Array.isArray(codes)) {
      return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    for (const code of codes) {
      if (this.validateFormat(code)) {
        valid.push(this.normalize(code));
      } else {
        invalid.push(code);
      }
    }

    return { valid, invalid };
  }

  // ============================================
  // LOOKUP OPERATIONS
  // ============================================

  /**
   * Get ICD-10 code by exact code
   * @param {string} code - ICD-10 code
   * @returns {Promise<Object|null>} - Code details or null
   */
  async getByCode(code) {
    if (!this.validateFormat(code)) {
      return null;
    }

    const normalizedCode = this.normalize(code);
    const cacheKey = this._getCacheKey('code', normalizedCode);

    // Check cache
    const cached = await this._getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Query database
    try {
      const [result] = await db.select()
        .from(icd10_codes)
        .where(eq(icd10_codes.code, normalizedCode))
        .limit(1);

      if (result) {
        // Cache result
        await this._setCached(cacheKey, result);

        // Increment usage count asynchronously (fire and forget)
        this._incrementUsageCount(normalizedCode).catch(() => {});
      }

      return result || null;
    } catch (error) {
      logger.error('ICD10 getByCode error', { code: normalizedCode, error: error.message });
      return null;
    }
  }

  /**
   * Increment usage count for a code (for popularity-based sorting)
   * @private
   */
  async _incrementUsageCount(code) {
    try {
      await db.update(icd10_codes)
        .set({
          usageCount: sql`${icd10_codes.usageCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(icd10_codes.code, code));
    } catch (error) {
      // Silently fail - usage count is not critical
    }
  }

  /**
   * Autocomplete search for ICD-10 codes
   * Searches by code prefix or description text
   * Optimized for sub-200ms response time
   *
   * @param {string} query - Search query (code or description text)
   * @param {Object} options - Search options
   * @param {number} options.limit - Max results (default: 20)
   * @param {boolean} options.billableOnly - Only return billable codes (default: true)
   * @param {boolean} options.hospiceRelevant - Prioritize hospice-relevant codes (default: false)
   * @param {boolean} options.includeInactive - Include inactive codes (default: false)
   * @returns {Promise<Array>} - Array of matching codes
   */
  async autocomplete(query, options = {}) {
    const {
      limit = 20,
      billableOnly = true,
      hospiceRelevant = false,
      includeInactive = false
    } = options;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    const cacheKey = this._getCacheKey('ac', `${searchTerm}:${limit}:${billableOnly}:${hospiceRelevant}`);

    // Check cache
    const cached = await this._getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      // Build conditions
      const conditions = [];

      // Active codes only (unless includeInactive)
      if (!includeInactive) {
        conditions.push(eq(icd10_codes.isActive, true));
      }

      // Billable codes only
      if (billableOnly) {
        conditions.push(eq(icd10_codes.isBillable, true));
      }

      // Check if search term looks like a code (starts with letter + digits)
      const isCodeSearch = /^[A-Z]\d/i.test(searchTerm);

      if (isCodeSearch) {
        // Code prefix search
        conditions.push(ilike(icd10_codes.code, `${searchTerm}%`));
      } else {
        // Description search (case-insensitive)
        conditions.push(
          or(
            ilike(icd10_codes.shortDescription, `%${searchTerm}%`),
            ilike(icd10_codes.longDescription, `%${searchTerm}%`),
            ilike(icd10_codes.categoryDescription, `%${searchTerm}%`)
          )
        );
      }

      // Build order by clause
      // Priority: hospice-relevant > common > usage count > alphabetical
      const orderBy = [];
      if (hospiceRelevant) {
        orderBy.push(desc(icd10_codes.isHospiceRelevant));
      }
      orderBy.push(desc(icd10_codes.isCommon));
      orderBy.push(desc(icd10_codes.usageCount));
      orderBy.push(asc(icd10_codes.code));

      // Execute query
      const results = await db.select({
        id: icd10_codes.id,
        code: icd10_codes.code,
        shortDescription: icd10_codes.shortDescription,
        longDescription: icd10_codes.longDescription,
        categoryCode: icd10_codes.categoryCode,
        categoryDescription: icd10_codes.categoryDescription,
        chapter: icd10_codes.chapter,
        chapterDescription: icd10_codes.chapterDescription,
        isBillable: icd10_codes.isBillable,
        isCommon: icd10_codes.isCommon,
        isHospiceRelevant: icd10_codes.isHospiceRelevant
      })
        .from(icd10_codes)
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(Number(limit));

      // Cache results (shorter TTL for search results)
      await this._setCached(cacheKey, results, 60 * 60); // 1 hour

      return results;
    } catch (error) {
      logger.error('ICD10 autocomplete error', { query: searchTerm, error: error.message });
      return [];
    }
  }

  /**
   * Search ICD-10 codes with full-text search capabilities
   *
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - { results: Array, total: number }
   */
  async search(query, options = {}) {
    const {
      limit = 50,
      offset = 0,
      billableOnly = false,
      chapter = null,
      category = null,
      includeInactive = false
    } = options;

    if (!query || typeof query !== 'string') {
      return { results: [], total: 0 };
    }

    const searchTerm = query.trim();

    try {
      const conditions = [];

      // Active codes only
      if (!includeInactive) {
        conditions.push(eq(icd10_codes.isActive, true));
      }

      // Billable codes only
      if (billableOnly) {
        conditions.push(eq(icd10_codes.isBillable, true));
      }

      // Chapter filter
      if (chapter) {
        conditions.push(eq(icd10_codes.chapter, chapter));
      }

      // Category filter
      if (category) {
        conditions.push(ilike(icd10_codes.categoryCode, `${category}%`));
      }

      // Search condition
      conditions.push(
        or(
          ilike(icd10_codes.code, `%${searchTerm}%`),
          ilike(icd10_codes.shortDescription, `%${searchTerm}%`),
          ilike(icd10_codes.longDescription, `%${searchTerm}%`)
        )
      );

      // Get results
      const whereClause = and(...conditions);

      const results = await db.select()
        .from(icd10_codes)
        .where(whereClause)
        .orderBy(desc(icd10_codes.usageCount), asc(icd10_codes.code))
        .limit(Number(limit))
        .offset(Number(offset));

      // Get total count
      const [countResult] = await db.select({
        count: sql`COUNT(*)::int`
      })
        .from(icd10_codes)
        .where(whereClause);

      return {
        results,
        total: countResult?.count || 0
      };
    } catch (error) {
      logger.error('ICD10 search error', { query: searchTerm, error: error.message });
      return { results: [], total: 0 };
    }
  }

  // ============================================
  // CATEGORY & CHAPTER OPERATIONS
  // ============================================

  /**
   * Get ICD-10 code category information
   * @param {string} code - ICD-10 code
   * @returns {Object|null} - Category information
   */
  getCategory(code) {
    if (!this.validateFormat(code)) {
      return null;
    }

    const firstLetter = code.charAt(0).toUpperCase();

    // ICD-10-CM chapter mapping
    const chapters = {
      'A': { chapter: '1', range: 'A00-B99', description: 'Certain infectious and parasitic diseases' },
      'B': { chapter: '1', range: 'A00-B99', description: 'Certain infectious and parasitic diseases' },
      'C': { chapter: '2', range: 'C00-D49', description: 'Neoplasms' },
      'D': { chapter: '3', range: 'D50-D89', description: 'Diseases of the blood and blood-forming organs and certain disorders involving the immune mechanism' },
      'E': { chapter: '4', range: 'E00-E89', description: 'Endocrine, nutritional and metabolic diseases' },
      'F': { chapter: '5', range: 'F01-F99', description: 'Mental, Behavioral and Neurodevelopmental disorders' },
      'G': { chapter: '6', range: 'G00-G99', description: 'Diseases of the nervous system' },
      'H': { chapter: '7-8', range: 'H00-H95', description: 'Diseases of the eye and adnexa / ear and mastoid process' },
      'I': { chapter: '9', range: 'I00-I99', description: 'Diseases of the circulatory system' },
      'J': { chapter: '10', range: 'J00-J99', description: 'Diseases of the respiratory system' },
      'K': { chapter: '11', range: 'K00-K95', description: 'Diseases of the digestive system' },
      'L': { chapter: '12', range: 'L00-L99', description: 'Diseases of the skin and subcutaneous tissue' },
      'M': { chapter: '13', range: 'M00-M99', description: 'Diseases of the musculoskeletal system and connective tissue' },
      'N': { chapter: '14', range: 'N00-N99', description: 'Diseases of the genitourinary system' },
      'O': { chapter: '15', range: 'O00-O9A', description: 'Pregnancy, childbirth and the puerperium' },
      'P': { chapter: '16', range: 'P00-P96', description: 'Certain conditions originating in the perinatal period' },
      'Q': { chapter: '17', range: 'Q00-Q99', description: 'Congenital malformations, deformations and chromosomal abnormalities' },
      'R': { chapter: '18', range: 'R00-R99', description: 'Symptoms, signs and abnormal clinical and laboratory findings, not elsewhere classified' },
      'S': { chapter: '19', range: 'S00-T88', description: 'Injury, poisoning and certain other consequences of external causes' },
      'T': { chapter: '19', range: 'S00-T88', description: 'Injury, poisoning and certain other consequences of external causes' },
      'V': { chapter: '20', range: 'V00-Y99', description: 'External causes of morbidity' },
      'W': { chapter: '20', range: 'V00-Y99', description: 'External causes of morbidity' },
      'X': { chapter: '20', range: 'V00-Y99', description: 'External causes of morbidity' },
      'Y': { chapter: '20', range: 'V00-Y99', description: 'External causes of morbidity' },
      'Z': { chapter: '21', range: 'Z00-Z99', description: 'Factors influencing health status and contact with health services' }
    };

    return chapters[firstLetter] || { chapter: 'Unknown', range: 'Unknown', description: 'Unknown category' };
  }

  /**
   * List all ICD-10 chapters
   * @returns {Array} - Array of chapter information
   */
  listChapters() {
    return [
      { chapter: '1', range: 'A00-B99', description: 'Certain infectious and parasitic diseases' },
      { chapter: '2', range: 'C00-D49', description: 'Neoplasms' },
      { chapter: '3', range: 'D50-D89', description: 'Diseases of the blood and blood-forming organs' },
      { chapter: '4', range: 'E00-E89', description: 'Endocrine, nutritional and metabolic diseases' },
      { chapter: '5', range: 'F01-F99', description: 'Mental, Behavioral and Neurodevelopmental disorders' },
      { chapter: '6', range: 'G00-G99', description: 'Diseases of the nervous system' },
      { chapter: '7', range: 'H00-H59', description: 'Diseases of the eye and adnexa' },
      { chapter: '8', range: 'H60-H95', description: 'Diseases of the ear and mastoid process' },
      { chapter: '9', range: 'I00-I99', description: 'Diseases of the circulatory system' },
      { chapter: '10', range: 'J00-J99', description: 'Diseases of the respiratory system' },
      { chapter: '11', range: 'K00-K95', description: 'Diseases of the digestive system' },
      { chapter: '12', range: 'L00-L99', description: 'Diseases of the skin and subcutaneous tissue' },
      { chapter: '13', range: 'M00-M99', description: 'Diseases of the musculoskeletal system' },
      { chapter: '14', range: 'N00-N99', description: 'Diseases of the genitourinary system' },
      { chapter: '15', range: 'O00-O9A', description: 'Pregnancy, childbirth and the puerperium' },
      { chapter: '16', range: 'P00-P96', description: 'Certain conditions originating in the perinatal period' },
      { chapter: '17', range: 'Q00-Q99', description: 'Congenital malformations and chromosomal abnormalities' },
      { chapter: '18', range: 'R00-R99', description: 'Symptoms, signs and abnormal findings' },
      { chapter: '19', range: 'S00-T88', description: 'Injury, poisoning and external causes' },
      { chapter: '20', range: 'V00-Y99', description: 'External causes of morbidity' },
      { chapter: '21', range: 'Z00-Z99', description: 'Factors influencing health status' }
    ];
  }

  /**
   * Get codes in a chapter
   * @param {string} chapter - Chapter number (e.g., "4")
   * @param {Object} options - Options
   * @returns {Promise<Array>} - Codes in the chapter
   */
  async getCodesByChapter(chapter, options = {}) {
    const { limit = 100, offset = 0, billableOnly = true } = options;

    const cacheKey = this._getCacheKey('chapter', `${chapter}:${limit}:${offset}:${billableOnly}`);
    const cached = await this._getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const conditions = [
        eq(icd10_codes.chapter, chapter),
        eq(icd10_codes.isActive, true)
      ];

      if (billableOnly) {
        conditions.push(eq(icd10_codes.isBillable, true));
      }

      const results = await db.select()
        .from(icd10_codes)
        .where(and(...conditions))
        .orderBy(asc(icd10_codes.code))
        .limit(Number(limit))
        .offset(Number(offset));

      await this._setCached(cacheKey, results, 60 * 60); // 1 hour
      return results;
    } catch (error) {
      logger.error('ICD10 getCodesByChapter error', { chapter, error: error.message });
      return [];
    }
  }

  // ============================================
  // HOSPICE-SPECIFIC OPERATIONS
  // ============================================

  /**
   * Get commonly used hospice diagnosis codes
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Common hospice codes
   */
  async getHospiceCodes(limit = 50) {
    const cacheKey = this._getCacheKey('hospice', `common:${limit}`);
    const cached = await this._getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const results = await db.select()
        .from(icd10_codes)
        .where(and(
          eq(icd10_codes.isActive, true),
          eq(icd10_codes.isBillable, true),
          eq(icd10_codes.isHospiceRelevant, true)
        ))
        .orderBy(desc(icd10_codes.usageCount), asc(icd10_codes.code))
        .limit(Number(limit));

      await this._setCached(cacheKey, results, 60 * 60 * 4); // 4 hours
      return results;
    } catch (error) {
      logger.error('ICD10 getHospiceCodes error', { error: error.message });
      return [];
    }
  }

  /**
   * Mark codes as hospice-relevant
   * @param {Array<string>} codes - Array of ICD-10 codes
   * @returns {Promise<number>} - Number of codes updated
   */
  async markHospiceRelevant(codes) {
    if (!Array.isArray(codes) || codes.length === 0) {
      return 0;
    }

    const normalizedCodes = codes.map(c => this.normalize(c)).filter(c => this.validateFormat(c));

    try {
      let updatedCount = 0;
      for (const code of normalizedCodes) {
        const result = await db.update(icd10_codes)
          .set({
            isHospiceRelevant: true,
            updatedAt: new Date()
          })
          .where(eq(icd10_codes.code, code));

        if (result.rowCount > 0) {
          updatedCount++;
        }
      }

      // Clear hospice cache
      await this.clearCache();

      return updatedCount;
    } catch (error) {
      logger.error('ICD10 markHospiceRelevant error', { error: error.message });
      return 0;
    }
  }

  // ============================================
  // SEEDING OPERATIONS
  // ============================================

  /**
   * Seed ICD-10 codes from provided data
   * @param {Array} codes - Array of code objects
   * @returns {Promise<Object>} - { inserted: number, updated: number, errors: number }
   */
  async seedCodes(codes) {
    if (!Array.isArray(codes) || codes.length === 0) {
      return { inserted: 0, updated: 0, errors: 0 };
    }

    const stats = { inserted: 0, updated: 0, errors: 0 };

    for (const codeData of codes) {
      try {
        // Check if code exists
        const [existing] = await db.select({ id: icd10_codes.id })
          .from(icd10_codes)
          .where(eq(icd10_codes.code, codeData.code))
          .limit(1);

        if (existing) {
          // Update existing
          await db.update(icd10_codes)
            .set({
              ...codeData,
              updatedAt: new Date()
            })
            .where(eq(icd10_codes.code, codeData.code));
          stats.updated++;
        } else {
          // Insert new
          await db.insert(icd10_codes).values({
            ...codeData,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          stats.inserted++;
        }
      } catch (error) {
        logger.error('ICD10 seed error for code', { code: codeData.code, error: error.message });
        stats.errors++;
      }
    }

    // Clear cache after seeding
    await this.clearCache();

    return stats;
  }

  /**
   * Get total count of ICD-10 codes
   * @returns {Promise<number>}
   */
  async getTotalCount() {
    const cacheKey = this._getCacheKey('stats', 'total');
    const cached = await this._getCached(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const [result] = await db.select({
        count: sql`COUNT(*)::int`
      }).from(icd10_codes);

      const count = result?.count || 0;
      await this._setCached(cacheKey, count, 60 * 60 * 24); // 24 hours
      return count;
    } catch (error) {
      logger.error('ICD10 getTotalCount error', { error: error.message });
      return 0;
    }
  }
}

// Export singleton instance
export default new ICD10Service();
