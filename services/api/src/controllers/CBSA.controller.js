import CBSALookupService from '../services/CBSALookupService.js';

import { logger } from '../utils/logger.js';
/**
 * CBSA Controller
 * Phase 2A - Electronic Submission Features
 *
 * Manages CBSA (Core Based Statistical Area) lookup and auto-population
 * CMS Requirement: Track CBSA for Value Codes 61 and G8
 *
 * Endpoints:
 * - GET /api/cbsa/lookup/:zip - Lookup CBSA by ZIP code
 * - POST /api/cbsa/auto-populate/:claimId - Auto-populate CBSA on claim
 * - GET /api/cbsa/validate/:claimId - Validate CBSA completeness
 * - GET /api/cbsa/codes - Get all CBSA codes (paginated)
 * - POST /api/cbsa/bulk-import - Bulk import CBSA codes
 */
class CBSAController {

  /**
   * Lookup CBSA code by ZIP code
   * GET /api/cbsa/lookup/:zip
   *
   * Params: zip (5-digit ZIP code)
   * Response: { status, data: { cbsa_details } }
   */
  async lookupByZip(request, reply) {
    try {
      const { zip } = request.params;

      if (!zip) {
        reply.code(400);
        return {
          status: 'error',
          message: 'ZIP code parameter is required'
        };
      }

      const cbsaData = await CBSALookupService.lookupByZip(zip);

      if (!cbsaData) {
        reply.code(404);
        return {
          status: 'error',
          message: `CBSA not found for ZIP code: ${zip}`
        };
      }

      reply.code(200);
      return {
        status: 'success',
        data: {
          zip_code: cbsaData.zip_code,
          cbsa_code: cbsaData.cbsa_code,
          cbsa_title: cbsaData.cbsa_title,
          state: cbsaData.state,
          county: cbsaData.county,
          is_metropolitan: cbsaData.is_metropolitan,
          population: cbsaData.population
        }
      };
    } catch (error) {
      logger.error('Error in lookupByZip:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to lookup CBSA',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Auto-populate CBSA codes on claim service lines
   * POST /api/cbsa/auto-populate/:claimId
   *
   * Params: claimId
   * Response: { status, data: { claim_id, patient_zip, patient_cbsa, service_lines_updated, value_codes_added } }
   */
  async autoPopulateClaim(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const result = await CBSALookupService.autoPopulateClaim(parseInt(claimId));

      reply.code(200);
      return {
        status: 'success',
        message: `CBSA codes populated for ${result.serviceLinesUpdated} service lines`,
        data: {
          claim_id: result.claimId,
          patient_zip: result.patientZip,
          patient_cbsa: result.patientCbsa,
          service_lines_updated: result.serviceLinesUpdated,
          value_codes_added: result.valueCodesAdded
        }
      };
    } catch (error) {
      logger.error('Error in autoPopulateClaim:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to auto-populate CBSA',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Validate CBSA completeness for claim
   * GET /api/cbsa/validate/:claimId
   *
   * Params: claimId
   * Response: { status, data: { claim_id, is_valid, errors, warnings } }
   */
  async validateClaim(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const result = await CBSALookupService.validateCBSA(parseInt(claimId));

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_id: result.claimId,
          is_valid: result.isValid,
          errors: result.errors,
          warnings: result.warnings
        }
      };
    } catch (error) {
      logger.error('Error in validateClaim:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to validate CBSA',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get all CBSA codes with pagination
   * GET /api/cbsa/codes?page=1&limit=100&state=NY
   *
   * Query params: page, limit, state (optional)
   * Response: { status, data: { records, pagination } }
   */
  async getAllCodes(request, reply) {
    try {
      const { page = 1, limit = 100, state } = request.query;

      const options = {
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 1000), // Max 1000 per page
        state: state || null
      };

      const result = await CBSALookupService.getAllCBSA(options);

      reply.code(200);
      return {
        status: 'success',
        data: {
          records: result.records,
          pagination: result.pagination
        }
      };
    } catch (error) {
      logger.error('Error in getAllCodes:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve CBSA codes',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Bulk import CBSA codes from data file
   * POST /api/cbsa/bulk-import
   *
   * Body: { data: [...], replace_existing: boolean }
   * Response: { status, data: { records_imported, records_updated, records_failed, import_duration_ms } }
   */
  async bulkImport(request, reply) {
    try {
      const { data, replace_existing = false } = request.body;

      if (!data || !Array.isArray(data)) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Request body must contain a "data" array of CBSA records'
        };
      }

      if (data.length === 0) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Data array cannot be empty'
        };
      }

      // Validate data structure (sample first record)
      const sampleRecord = data[0];
      const requiredFields = ['zip_code', 'cbsa_code', 'cbsa_title', 'state'];
      const missingFields = requiredFields.filter(field => !sampleRecord[field]);

      if (missingFields.length > 0) {
        reply.code(400);
        return {
          status: 'error',
          message: `Missing required fields in data: ${missingFields.join(', ')}`
        };
      }

      const result = await CBSALookupService.bulkImport(data, replace_existing);

      reply.code(200);
      return {
        status: 'success',
        message: `Successfully imported ${result.recordsImported} CBSA codes`,
        data: {
          records_imported: result.recordsImported,
          records_updated: result.recordsUpdated,
          records_failed: result.recordsFailed,
          import_duration_ms: result.importDurationMs
        }
      };
    } catch (error) {
      logger.error('Error in bulkImport:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to import CBSA codes',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Clear CBSA lookup cache
   * POST /api/cbsa/clear-cache
   *
   * Response: { status, message, data: { cleared, timestamp } }
   */
  async clearCache(request, reply) {
    try {
      const result = await CBSALookupService.clearCache();

      reply.code(200);
      return {
        status: 'success',
        message: 'CBSA cache cleared successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error in clearCache:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to clear cache',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Autocomplete search for CBSA titles/cities
   * GET /api/cbsa/autocomplete?q=query&limit=10&state=NY
   *
   * Query params: q (search query, required), limit (optional), state (optional)
   * Response: { status, data: [...] }
   */
  async autocomplete(request, reply) {
    try {
      const { q, limit = 10, state } = request.query;

      if (!q || q.trim().length < 2) {
        reply.code(200);
        return {
          status: 'success',
          data: [],
          message: 'Query must be at least 2 characters'
        };
      }

      const options = {
        limit: Math.min(parseInt(limit), 25), // Max 25 results for autocomplete
        state: state || null
      };

      const results = await CBSALookupService.autocomplete(q, options);

      reply.code(200);
      return {
        status: 'success',
        data: results
      };
    } catch (error) {
      logger.error('Error in autocomplete:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to search CBSA codes',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get CBSA cache statistics
   * GET /api/cbsa/cache-stats
   *
   * Response: { status, data: { driver, cachePrefix, cacheTTL, ... } }
   */
  async getCacheStats(request, reply) {
    try {
      const stats = await CBSALookupService.getCacheStats();

      reply.code(200);
      return {
        status: 'success',
        data: stats
      };
    } catch (error) {
      logger.error('Error in getCacheStats:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get cache stats',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}

// Export singleton instance
export default new CBSAController();
