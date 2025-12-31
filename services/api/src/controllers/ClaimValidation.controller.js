import ClaimScrubber from '../services/ClaimScrubber.service.js';

import { logger } from '../utils/logger.js';
/**
 * Claim Validation Controller
 * Phase 2B - Claim Scrubbing System
 *
 * Manages comprehensive claim validation and scrubbing
 * Features:
 *   - Pre-submission claim scrubbing
 *   - Auto-fix for common errors
 *   - Validation history tracking
 *   - Batch claim validation
 *
 * Endpoints:
 * - POST /api/claims/:id/scrub - Scrub single claim
 * - GET /api/claims/:id/validation-results - Get latest validation results
 * - GET /api/claims/:id/validation-history - Get validation history
 * - POST /api/claims/:id/auto-fix - Auto-fix claim errors
 * - GET /api/claims/failed-validation - Get claims failing validation
 * - POST /api/claims/batch-scrub - Batch scrub claims
 */
class ClaimValidationController {

  /**
   * Scrub claim - Run comprehensive validation
   * POST /api/claims/:id/scrub
   *
   * Params: id (claim ID)
   * Response: { status, data: { claim_id, validation_date, passed, errors, warnings, corrections, summary } }
   */
  async scrubClaim(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const results = await ClaimScrubber.scrubClaim(parseInt(id));

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_id: results.claimId,
          validation_date: results.validationDate,
          passed: results.passed,
          errors: results.errors,
          warnings: results.warnings,
          corrections: results.corrections,
          summary: {
            fields_validated: results.fieldsValidated,
            fields_passed: results.fieldsPassed,
            fields_failed: results.fieldsFailed,
            errors_count: results.errors.length,
            warnings_count: results.warnings.length
          }
        }
      };
    } catch (error) {
      logger.error('Error in scrubClaim:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to scrub claim',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get latest validation results for claim
   * GET /api/claims/:id/validation-results
   *
   * Params: id (claim ID)
   * Response: { status, data: { validation_id, claim_id, validation_date, validation_type, passed, errors, warnings } }
   */
  async getLatestValidationResults(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const results = await ClaimScrubber.getLatestValidationResults(parseInt(id));

      if (!results) {
        reply.code(404);
        return {
          status: 'error',
          message: `No validation results found for claim ${id}`
        };
      }

      reply.code(200);
      return {
        status: 'success',
        data: {
          validation_id: results.id,
          claim_id: results.claim_id,
          validation_date: results.validation_date,
          validation_type: results.validation_type,
          passed: results.passed,
          errors: results.errors,
          warnings: results.warnings,
          validator_version: results.validator_version
        }
      };
    } catch (error) {
      logger.error('Error in getLatestValidationResults:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve validation results',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get validation history for claim
   * GET /api/claims/:id/validation-history?limit=10
   *
   * Params: id (claim ID)
   * Query: limit (number of records, default 10)
   * Response: { status, data: { claim_id, validations: [...] } }
   */
  async getValidationHistory(request, reply) {
    try {
      const { id } = request.params;
      const { limit = 10 } = request.query;

      if (!id) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const history = await ClaimScrubber.getValidationHistory(
        parseInt(id),
        Math.min(parseInt(limit), 100) // Max 100 records
      );

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_id: parseInt(id),
          validations: history.map(v => ({
            validation_id: v.id,
            validation_date: v.validation_date,
            validation_type: v.validation_type,
            passed: v.passed,
            errors_count: Array.isArray(v.errors) ? v.errors.length : 0,
            warnings_count: Array.isArray(v.warnings) ? v.warnings.length : 0
          }))
        }
      };
    } catch (error) {
      logger.error('Error in getValidationHistory:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve validation history',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Auto-fix claim errors
   * POST /api/claims/:id/auto-fix
   *
   * Params: id (claim ID)
   * Response: { status, message, data: { claim_id, corrections_applied, errors_remaining } }
   */
  async autoFixClaim(request, reply) {
    try {
      const { id } = request.params;

      if (!id) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const results = await ClaimScrubber.autoFix(parseInt(id));

      const message = results.correctionsApplied.length > 0
        ? `Auto-fixed ${results.correctionsApplied.length} errors`
        : 'No auto-fixable errors found';

      reply.code(200);
      return {
        status: 'success',
        message,
        data: {
          claim_id: results.claimId,
          corrections_applied: results.correctionsApplied,
          errors_remaining: results.errorsRemaining
        }
      };
    } catch (error) {
      logger.error('Error in autoFixClaim:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to auto-fix claim',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get claims failing validation
   * GET /api/claims/failed-validation?payer_id=1&date_from=2025-01-01
   *
   * Query: payer_id (optional), date_from (optional)
   * Response: { status, data: { claims: [...], summary: { total_claims, claims_with_errors, auto_fixable } } }
   */
  async getFailingClaims(request, reply) {
    try {
      const { payer_id, date_from } = request.query;

      const filters = {};
      if (payer_id) {
        filters.payer_id = parseInt(payer_id);
      }
      if (date_from) {
        filters.date_from = date_from;
      }

      const failingClaims = await ClaimScrubber.getFailingClaims(filters);

      // Get validation results for each failing claim to determine auto-fixable count
      let autoFixableCount = 0;
      const claimsWithDetails = await Promise.all(
        failingClaims.slice(0, 50).map(async (claim) => { // Limit to 50 for performance
          try {
            const validationResults = await ClaimScrubber.getLatestValidationResults(claim.id);

            if (validationResults && validationResults.data_corrections) {
              const autoFixable = validationResults.data_corrections.filter(c => c.autoFixable).length;
              if (autoFixable > 0) {
                autoFixableCount++;
              }

              return {
                claim_id: claim.id,
                patient_id: claim.patient_id,
                service_date: claim.service_start_date,
                last_scrubbed_at: claim.last_scrubbed_at,
                errors_count: Array.isArray(validationResults.errors) ? validationResults.errors.length : 0,
                warnings_count: Array.isArray(validationResults.warnings) ? validationResults.warnings.length : 0,
                auto_fixable: autoFixable
              };
            }

            return {
              claim_id: claim.id,
              patient_id: claim.patient_id,
              service_date: claim.service_start_date,
              last_scrubbed_at: claim.last_scrubbed_at,
              errors_count: 0,
              warnings_count: 0,
              auto_fixable: 0
            };
          } catch (err) {
            logger.error(`Error getting validation for claim ${claim.id}:`, err)
            return {
              claim_id: claim.id,
              patient_id: claim.patient_id,
              service_date: claim.service_start_date,
              last_scrubbed_at: claim.last_scrubbed_at,
              errors_count: 0,
              warnings_count: 0,
              auto_fixable: 0
            };
          }
        })
      );

      reply.code(200);
      return {
        status: 'success',
        data: {
          claims: claimsWithDetails,
          summary: {
            total_claims: failingClaims.length,
            claims_with_errors: failingClaims.length,
            auto_fixable: autoFixableCount
          }
        }
      };
    } catch (error) {
      logger.error('Error in getFailingClaims:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve failing claims',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Batch scrub claims
   * POST /api/claims/batch-scrub
   *
   * Body: { claim_ids: [1, 2, 3], auto_fix: true }
   * Response: { status, data: { claims_processed, claims_passed, claims_failed, auto_fixed_count, processing_time_ms } }
   */
  async batchScrubClaims(request, reply) {
    try {
      const { claim_ids, auto_fix = false } = request.body;

      if (!claim_ids || !Array.isArray(claim_ids)) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Request body must contain a "claim_ids" array'
        };
      }

      if (claim_ids.length === 0) {
        reply.code(400);
        return {
          status: 'error',
          message: 'claim_ids array cannot be empty'
        };
      }

      if (claim_ids.length > 100) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Maximum 100 claims can be scrubbed at once'
        };
      }

      const results = await ClaimScrubber.batchScrub(claim_ids, auto_fix);

      reply.code(200);
      return {
        status: 'success',
        data: {
          claims_processed: results.claimsProcessed,
          claims_passed: results.claimsPassed,
          claims_failed: results.claimsFailed,
          auto_fixed_count: results.autoFixedCount,
          processing_time_ms: results.processingTimeMs
        }
      };
    } catch (error) {
      logger.error('Error in batchScrubClaims:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to batch scrub claims',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}

// Export singleton instance
export default new ClaimValidationController();
