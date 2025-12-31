import { db } from '../db/index.js';
import { cbsa_codes } from '../db/schemas/cbsa.schema.js';
import { claims } from '../db/schemas/billing.schema.js';
import { claim_service_lines } from '../db/schemas/billing.schema.js';
import { eq, and, lte, gte, isNull, or, sql } from 'drizzle-orm';
import CacheService from './CacheService.js';

import { logger } from '../utils/logger.js';
/**
 * CBSA Lookup Service
 * Phase 2A - Electronic Submission Features
 *
 * Purpose: Handle ZIP code to CBSA mapping and auto-population for Value Codes 61/G8
 * CMS Requirement: Track Core Based Statistical Area (CBSA) for:
 *   - Value Code 61: Routine/Continuous Home Care (revenue 0651, 0652)
 *   - Value Code G8: Inpatient Care (revenue 0655, 0656)
 *
 * Caching: Uses CacheService for distributed caching with TTL support
 * - ZIP lookups cached for 24 hours (CBSA mappings rarely change)
 * - Cache key pattern: cbsa:zip:{zipCode}
 */
class CBSALookupService {
  constructor() {
    this.cacheEnabled = true;
    this.cachePrefix = 'cbsa:zip:';
    this.cacheTTL = 86400; // 24 hours in seconds
  }

  /**
   * Lookup CBSA code by ZIP code
   * @param {string} zipCode - 5-digit ZIP
   * @returns {Promise<object|null>} CBSA details or null if not found
   */
  async lookupByZip(zipCode) {
    try {
      // 1. Normalize ZIP (remove ZIP+4, validate format)
      const normalizedZip = this.normalizeZip(zipCode);
      const cacheKey = `${this.cachePrefix}${normalizedZip}`;

      // 2. Check cache first (using CacheService for distributed caching)
      if (this.cacheEnabled) {
        const cached = await CacheService.get(cacheKey);
        if (cached) {
          logger.debug(`CBSA cache hit for ZIP ${normalizedZip}`);
          return cached;
        }
      }

      // 3. Query cbsa_codes table (get current effective record)
      const cbsaResults = await db
        .select({
          id: cbsa_codes.id,
          zip_code: cbsa_codes.zip_code,
          cbsa_code: cbsa_codes.cbsa_code,
          cbsa_title: cbsa_codes.cbsa_title,
          state: cbsa_codes.state,
          county: cbsa_codes.county,
          metropolitan_division: cbsa_codes.metropolitan_division,
          is_metropolitan: cbsa_codes.is_metropolitan,
          population: cbsa_codes.population,
          effective_date: cbsa_codes.effective_date,
          expiration_date: cbsa_codes.expiration_date,
          notes: cbsa_codes.notes,
          created_at: cbsa_codes.created_at,
          updated_at: cbsa_codes.updated_at
        })
        .from(cbsa_codes)
        .where(
          and(
            eq(cbsa_codes.zip_code, normalizedZip),
            lte(cbsa_codes.effective_date, sql`CURRENT_DATE`),
            or(
              isNull(cbsa_codes.expiration_date),
              gte(cbsa_codes.expiration_date, sql`CURRENT_DATE`)
            )
          )
        )
        .limit(1);

      const cbsa = cbsaResults[0] || null;

      // 4. Cache the result with TTL (using CacheService)
      if (cbsa && this.cacheEnabled) {
        await CacheService.set(cacheKey, cbsa, this.cacheTTL);
        logger.debug(`CBSA cached for ZIP ${normalizedZip} (TTL: ${this.cacheTTL}s)`);
      }

      return cbsa;
    } catch (error) {
      logger.error(`Error looking up CBSA for ZIP ${zipCode}:`, error)
      throw new Error(`CBSA lookup failed: ${error.message}`);
    }
  }

  /**
   * Auto-populate CBSA codes on claim service lines
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Updated service lines summary
   */
  async autoPopulateClaim(claimId) {
    try {
      // 1. Get claim with service lines
      const claim = await this.getClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      // 2. Get patient address ZIP code (assuming patient has address)
      // Note: This will need to be adapted based on actual patient schema
      const patientZip = claim.patient_zip || claim.patient?.zip_code;

      if (!patientZip) {
        throw new Error(`Patient ZIP code not found for claim ${claimId}`);
      }

      // 3. Lookup CBSA for patient ZIP
      const patientCBSA = await this.lookupByZip(patientZip);

      if (!patientCBSA) {
        throw new Error(`CBSA not found for ZIP: ${patientZip}`);
      }

      const valueCodesToAdd = [];
      let linesUpdated = 0;

      // 4. For each service line, populate CBSA based on revenue code
      for (const line of claim.serviceLines || []) {
        const revenueCode = line.revenue_code || line.revenueCode;

        // RHC (0651) or CHC (0652) → Use patient CBSA for Value Code 61
        if (revenueCode === '0651' || revenueCode === '0652') {
          await db.update(claim_service_lines)
            .set({
              cbsa_code: patientCBSA.cbsa_code,
              service_location_zip: patientZip,
              service_location_city: patientCBSA.cbsa_title,
              service_location_state: patientCBSA.state
            })
            .where(eq(claim_service_lines.id, line.id));

          // Add Value Code 61
          valueCodesToAdd.push({
            code: '61',
            amount: parseInt(patientCBSA.cbsa_code)
          });

          linesUpdated++;
        }

        // IRC (0655) or GIP (0656) → Use facility CBSA for Value Code G8
        if (revenueCode === '0655' || revenueCode === '0656') {
          // Get facility ZIP from line or use default
          const facilityZip = line.facility_zip || claim.facility_zip || patientZip;
          const facilityCBSA = await this.lookupByZip(facilityZip);

          if (facilityCBSA) {
            await db.update(claim_service_lines)
              .set({
                facility_cbsa_code: facilityCBSA.cbsa_code,
                facility_npi: claim.facility_npi,
                facility_name: claim.facility_name
              })
              .where(eq(claim_service_lines.id, line.id));

            // Add Value Code G8
            valueCodesToAdd.push({
              code: 'G8',
              amount: parseInt(facilityCBSA.cbsa_code)
            });

            linesUpdated++;
          }
        }
      }

      // 5. Update claim value_codes JSONB field
      if (valueCodesToAdd.length > 0) {
        await db.update(claims)
          .set({
            value_codes: sql`COALESCE(${claims.value_codes}, '[]'::jsonb) || ${JSON.stringify(valueCodesToAdd)}::jsonb`
          })
          .where(eq(claims.id, claimId));
      }

      return {
        claimId,
        patientZip,
        patientCbsa: patientCBSA.cbsa_code,
        serviceLinesUpdated: linesUpdated,
        valueCodesAdded: valueCodesToAdd
      };
    } catch (error) {
      logger.error(`Error auto-populating CBSA for claim ${claimId}:`, error)
      throw new Error(`CBSA auto-population failed: ${error.message}`);
    }
  }

  /**
   * Validate CBSA completeness for claim
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Validation results
   */
  async validateCBSA(claimId) {
    try {
      const claim = await this.getClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      const errors = [];
      const warnings = [];

      // Check each service line for required CBSA codes
      for (const line of claim.serviceLines || []) {
        const revenueCode = line.revenue_code || line.revenueCode;
        const lineNumber = line.line_number || line.lineNumber;

        // Check RHC/CHC lines have CBSA
        if ((revenueCode === '0651' || revenueCode === '0652') && !line.cbsa_code) {
          errors.push(`Service line ${lineNumber} (revenue ${revenueCode}) missing CBSA code`);
        }

        // Check GIP/IRC lines have facility CBSA
        if ((revenueCode === '0655' || revenueCode === '0656') && !line.facility_cbsa_code) {
          errors.push(`Service line ${lineNumber} (revenue ${revenueCode}) missing facility CBSA code`);
        }
      }

      // Check value codes
      const valueCodes = claim.value_codes || [];
      const hasValueCode61 = valueCodes.some(vc => vc.code === '61');
      const hasValueCodeG8 = valueCodes.some(vc => vc.code === 'G8');

      const hasRhcChc = (claim.serviceLines || []).some(l =>
        (l.revenue_code || l.revenueCode) === '0651' || (l.revenue_code || l.revenueCode) === '0652'
      );
      const hasGipIrc = (claim.serviceLines || []).some(l =>
        (l.revenue_code || l.revenueCode) === '0655' || (l.revenue_code || l.revenueCode) === '0656'
      );

      if (hasRhcChc && !hasValueCode61) {
        errors.push('Value Code 61 required for RHC/CHC service lines');
      }

      if (hasGipIrc && !hasValueCodeG8) {
        errors.push('Value Code G8 required for GIP/IRC service lines');
      }

      return {
        claimId,
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logger.error(`Error validating CBSA for claim ${claimId}:`, error)
      throw new Error(`CBSA validation failed: ${error.message}`);
    }
  }

  /**
   * Normalize ZIP code (handle ZIP+4, validate format)
   * @param {string} zipCode - ZIP code to normalize
   * @returns {string} Normalized 5-digit ZIP code
   */
  normalizeZip(zipCode) {
    if (!zipCode) {
      throw new Error('ZIP code is required');
    }

    // Remove ZIP+4 extension (e.g., "12345-6789" → "12345")
    let normalized = zipCode.toString().split('-')[0].trim();

    // Pad to 5 digits
    normalized = normalized.padStart(5, '0');

    // Validate format
    if (!/^\d{5}$/.test(normalized)) {
      throw new Error(`Invalid ZIP code format: ${zipCode}`);
    }

    return normalized;
  }

  /**
   * Get all CBSA codes with pagination
   * @param {object} options - Query options
   * @returns {Promise<object>} Paginated CBSA results
   */
  async getAllCBSA(options = {}) {
    try {
      const {
        page = 1,
        limit = 100,
        state = null
      } = options;

      const offset = (page - 1) * limit;

      let query = db.select({
        id: cbsa_codes.id,
        zip_code: cbsa_codes.zip_code,
        cbsa_code: cbsa_codes.cbsa_code,
        cbsa_title: cbsa_codes.cbsa_title,
        state: cbsa_codes.state,
        county: cbsa_codes.county,
        metropolitan_division: cbsa_codes.metropolitan_division,
        is_metropolitan: cbsa_codes.is_metropolitan,
        population: cbsa_codes.population,
        effective_date: cbsa_codes.effective_date,
        expiration_date: cbsa_codes.expiration_date,
        notes: cbsa_codes.notes,
        created_at: cbsa_codes.created_at,
        updated_at: cbsa_codes.updated_at
      }).from(cbsa_codes);

      // Apply state filter if provided
      if (state) {
        query = query.where(eq(cbsa_codes.state, state));
      }

      // Get total count
      const countQuery = db.select({ count: sql`count(*)` }).from(cbsa_codes);
      if (state) {
        countQuery.where(eq(cbsa_codes.state, state));
      }
      const countResult = await countQuery;
      const total = parseInt(countResult[0]?.count || 0);

      // Get paginated results
      const records = await query
        .limit(limit)
        .offset(offset);

      return {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting CBSA codes:', error)
      throw new Error(`Failed to retrieve CBSA codes: ${error.message}`);
    }
  }

  /**
   * Bulk import CBSA codes from data array
   * @param {Array} cbsaDataArray - Array of CBSA data objects
   * @param {boolean} replaceExisting - Whether to expire existing records
   * @returns {Promise<object>} Import statistics
   */
  async bulkImport(cbsaDataArray, replaceExisting = false) {
    const startTime = Date.now();
    let imported = 0;
    let updated = 0;
    let failed = 0;

    try {
      // Begin transaction
      await db.transaction(async (tx) => {
        if (replaceExisting) {
          // Expire all existing records
          await tx.update(cbsa_codes)
            .set({ expiration_date: sql`CURRENT_DATE` })
            .where(isNull(cbsa_codes.expiration_date));
        }

        // Batch insert new records
        for (const cbsa of cbsaDataArray) {
          try {
            await tx.insert(cbsa_codes).values({
              zip_code: cbsa.zip_code,
              cbsa_code: cbsa.cbsa_code,
              cbsa_title: cbsa.cbsa_title,
              state: cbsa.state,
              county: cbsa.county || null,
              metropolitan_division: cbsa.metropolitan_division || null,
              is_metropolitan: cbsa.is_metropolitan !== false,
              population: cbsa.population || null,
              effective_date: cbsa.effective_date || sql`CURRENT_DATE`,
              expiration_date: cbsa.expiration_date || null,
              notes: cbsa.notes || null
            }).onConflictDoUpdate({
              target: [cbsa_codes.zip_code, cbsa_codes.effective_date],
              set: {
                cbsa_code: cbsa.cbsa_code,
                cbsa_title: cbsa.cbsa_title,
                updated_at: sql`CURRENT_TIMESTAMP`
              }
            });

            imported++;
          } catch (error) {
            logger.error(`Failed to import CBSA for ZIP ${cbsa.zip_code}:`, error)
            failed++;
          }
        }
      });

      // Clear CBSA cache after import
      await this.clearCache();

      const duration = Date.now() - startTime;

      return {
        recordsImported: imported,
        recordsUpdated: updated,
        recordsFailed: failed,
        importDurationMs: duration
      };
    } catch (error) {
      logger.error('Error during CBSA bulk import:', error)
      throw new Error(`Bulk import failed: ${error.message}`);
    }
  }

  /**
   * Get claim with service lines and related data
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Claim with service lines
   * @private
   */
  async getClaimWithDetails(claimId) {
    try {
      // Get claim
      const claimResults = await db
        .select({
          id: claims.id,
          patient_id: claims.patient_id,
          patient_zip: claims.patient_zip,
          facility_zip: claims.facility_zip,
          facility_npi: claims.facility_npi,
          facility_name: claims.facility_name,
          value_codes: claims.value_codes
        })
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claimResults[0]) {
        return null;
      }

      const claim = claimResults[0];

      // Get service lines
      const serviceLines = await db
        .select({
          id: claim_service_lines.id,
          claim_id: claim_service_lines.claim_id,
          revenue_code: claim_service_lines.revenue_code,
          cbsa_code: claim_service_lines.cbsa_code,
          facility_cbsa_code: claim_service_lines.facility_cbsa_code,
          facility_zip: claim_service_lines.facility_zip,
          service_location_zip: claim_service_lines.service_location_zip,
          service_location_city: claim_service_lines.service_location_city,
          service_location_state: claim_service_lines.service_location_state
        })
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, claimId));

      claim.serviceLines = serviceLines;

      return claim;
    } catch (error) {
      logger.error(`Error loading claim ${claimId} with details:`, error)
      throw new Error(`Failed to load claim details: ${error.message}`);
    }
  }

  /**
   * Clear the CBSA cache
   * Uses CacheService to clear all CBSA-related cache entries
   * @returns {Promise<object>} Cache clear result
   */
  async clearCache() {
    try {
      // Use CacheService flush to clear all cached items
      // Note: For more granular control with Redis, we could use pattern deletion
      await CacheService.flush();
      logger.info('CBSA cache cleared successfully');
      return { cleared: true, timestamp: new Date().toISOString() };
    } catch (error) {
      logger.error('Error clearing CBSA cache:', error);
      throw new Error(`Failed to clear CBSA cache: ${error.message}`);
    }
  }

  /**
   * Autocomplete search for CBSA titles/cities
   * @param {string} query - Search query (partial title or city name)
   * @param {object} options - Search options
   * @returns {Promise<Array>} Matching CBSA records (limited)
   */
  async autocomplete(query, options = {}) {
    try {
      const {
        limit = 10,
        state = null
      } = options;

      if (!query || query.trim().length < 2) {
        return [];
      }

      const searchTerm = query.trim();
      const cacheKey = `cbsa:autocomplete:${searchTerm.toLowerCase()}:${state || 'all'}`;

      // Check cache first
      if (this.cacheEnabled) {
        const cached = await CacheService.get(cacheKey);
        if (cached) {
          logger.debug(`CBSA autocomplete cache hit for "${searchTerm}"`);
          return cached;
        }
      }

      // Build search query using ILIKE for case-insensitive partial matching
      let query_builder = db.select({
        cbsa_code: cbsa_codes.cbsa_code,
        cbsa_title: cbsa_codes.cbsa_title,
        state: cbsa_codes.state,
        county: cbsa_codes.county,
        is_metropolitan: cbsa_codes.is_metropolitan,
        zip_code: cbsa_codes.zip_code
      }).from(cbsa_codes);

      // Apply search filter on cbsa_title (which contains city/metro area names)
      const conditions = [
        sql`${cbsa_codes.cbsa_title} ILIKE ${'%' + searchTerm + '%'}`,
        lte(cbsa_codes.effective_date, sql`CURRENT_DATE`),
        or(
          isNull(cbsa_codes.expiration_date),
          gte(cbsa_codes.expiration_date, sql`CURRENT_DATE`)
        )
      ];

      // Add state filter if provided
      if (state) {
        conditions.push(eq(cbsa_codes.state, state.toUpperCase()));
      }

      query_builder = query_builder.where(and(...conditions));

      // Get distinct CBSA codes (avoid duplicate entries from multiple ZIP mappings)
      // Order by title for predictable results, limit for autocomplete performance
      const results = await query_builder
        .orderBy(cbsa_codes.cbsa_title)
        .limit(limit * 5); // Get more to allow deduplication

      // Deduplicate by cbsa_code (keep first occurrence)
      const seenCodes = new Set();
      const uniqueResults = [];
      for (const record of results) {
        if (!seenCodes.has(record.cbsa_code)) {
          seenCodes.add(record.cbsa_code);
          uniqueResults.push({
            cbsa_code: record.cbsa_code,
            cbsa_title: record.cbsa_title,
            state: record.state,
            county: record.county,
            is_metropolitan: record.is_metropolitan,
            display_name: `${record.cbsa_title}, ${record.state} (${record.cbsa_code})`
          });
          if (uniqueResults.length >= limit) break;
        }
      }

      // Cache results with shorter TTL for autocomplete (1 hour)
      if (uniqueResults.length > 0 && this.cacheEnabled) {
        await CacheService.set(cacheKey, uniqueResults, 3600);
        logger.debug(`CBSA autocomplete cached for "${searchTerm}" (TTL: 3600s)`);
      }

      return uniqueResults;
    } catch (error) {
      logger.error(`Error in CBSA autocomplete for "${query}":`, error);
      throw new Error(`CBSA autocomplete failed: ${error.message}`);
    }
  }

  /**
   * Get cache statistics for monitoring
   * @returns {Promise<object>} Cache statistics
   */
  async getCacheStats() {
    try {
      const stats = await CacheService.stats();
      return {
        driver: stats.driver,
        cachePrefix: this.cachePrefix,
        cacheTTL: this.cacheTTL,
        cacheEnabled: this.cacheEnabled,
        ...stats
      };
    } catch (error) {
      logger.error('Error getting CBSA cache stats:', error);
      return {
        error: error.message,
        cacheEnabled: this.cacheEnabled
      };
    }
  }
}

// Export singleton instance
export default new CBSALookupService();
