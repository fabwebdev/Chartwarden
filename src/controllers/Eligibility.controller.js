import EligibilityVerifier from '../services/EligibilityVerifier.service.js';

import { logger } from '../utils/logger.js';
/**
 * Eligibility Controller
 * Phase 3A - Real-time Insurance Eligibility Verification
 *
 * Endpoints:
 * 1. POST   /api/eligibility/verify                 - Verify patient eligibility
 * 2. POST   /api/eligibility/batch-verify           - Batch verify multiple patients
 * 3. GET    /api/eligibility/coverage/:patientId    - Get current coverage
 * 4. GET    /api/eligibility/history/:patientId     - Get eligibility history
 * 5. POST   /api/eligibility/process-271            - Process 271 response
 * 6. GET    /api/eligibility/reverification-list    - Get patients needing reverification
 */
class EligibilityController {
  /**
   * 1. Verify patient eligibility
   * POST /api/eligibility/verify
   *
   * @body {number} patientId - Patient ID
   * @body {number} payerId - Payer ID (optional)
   * @body {string} serviceType - Service type (HOSPICE, MEDICAL, etc.)
   * @body {boolean} forceRefresh - Force refresh even if cached
   */
  async verifyEligibility(request, reply) {
    try {
      const {
        patientId,
        payerId,
        serviceType = 'HOSPICE',
        forceRefresh = false
      } = request.body;

      // Validation
      if (!patientId) {
        return reply.code(400).send({
          success: false,
          error: 'Patient ID is required'
        });
      }

      const result = await EligibilityVerifier.verifyEligibility({
        patientId,
        payerId,
        serviceType,
        forceRefresh,
        submittedBy: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error verifying eligibility:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 2. Batch verify eligibility for multiple patients
   * POST /api/eligibility/batch-verify
   *
   * @body {Array<number>} patientIds - Array of patient IDs
   * @body {string} serviceType - Service type
   * @body {boolean} forceRefresh - Force refresh
   */
  async batchVerifyEligibility(request, reply) {
    try {
      const {
        patientIds,
        serviceType = 'HOSPICE',
        forceRefresh = false
      } = request.body;

      // Validation
      if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Patient IDs array is required and must not be empty'
        });
      }

      if (patientIds.length > 100) {
        return reply.code(400).send({
          success: false,
          error: 'Maximum 100 patients can be verified in a single batch'
        });
      }

      const results = await EligibilityVerifier.batchVerifyEligibility(patientIds, {
        serviceType,
        forceRefresh,
        submittedBy: request.user?.id
      });

      const summary = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };

      return reply.code(200).send({
        success: true,
        summary,
        results
      });
    } catch (error) {
      logger.error('Error batch verifying eligibility:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 3. Get current coverage for patient
   * GET /api/eligibility/coverage/:patientId
   *
   * @param {number} patientId - Patient ID
   */
  async getCurrentCoverage(request, reply) {
    try {
      const { patientId } = request.params;

      if (!patientId) {
        return reply.code(400).send({
          success: false,
          error: 'Patient ID is required'
        });
      }

      const coverage = await EligibilityVerifier.getCurrentCoverage(parseInt(patientId));

      if (!coverage) {
        return reply.code(404).send({
          success: false,
          error: 'No coverage information found for this patient'
        });
      }

      return reply.code(200).send({
        success: true,
        data: coverage
      });
    } catch (error) {
      logger.error('Error getting current coverage:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 4. Get eligibility history for patient
   * GET /api/eligibility/history/:patientId
   *
   * @param {number} patientId - Patient ID
   * @query {number} limit - Limit results (default 10)
   */
  async getEligibilityHistory(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 10 } = request.query;

      if (!patientId) {
        return reply.code(400).send({
          success: false,
          error: 'Patient ID is required'
        });
      }

      const history = await EligibilityVerifier.getEligibilityHistory(
        parseInt(patientId),
        parseInt(limit)
      );

      return reply.code(200).send({
        success: true,
        count: history.length,
        data: history
      });
    } catch (error) {
      logger.error('Error getting eligibility history:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 5. Process 271 EDI response
   * POST /api/eligibility/process-271
   *
   * @body {string} requestId - Original request ID
   * @body {string} edi271Content - Raw 271 EDI content
   */
  async process271Response(request, reply) {
    try {
      const { requestId, edi271Content } = request.body;

      // Validation
      if (!requestId) {
        return reply.code(400).send({
          success: false,
          error: 'Request ID is required'
        });
      }

      if (!edi271Content) {
        return reply.code(400).send({
          success: false,
          error: '271 EDI content is required'
        });
      }

      const result = await EligibilityVerifier.process271Response({
        requestId,
        edi271Content,
        receivedAt: new Date()
      });

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error processing 271 response:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 6. Get list of patients needing reverification
   * GET /api/eligibility/reverification-list
   *
   * Returns patients whose eligibility cache has expired or will expire soon
   */
  async getReverificationList(request, reply) {
    try {
      const patients = await EligibilityVerifier.getPatientsNeedingReverification();

      return reply.code(200).send({
        success: true,
        count: patients.length,
        data: patients
      });
    } catch (error) {
      logger.error('Error getting reverification list:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Additional helper endpoints
   */

  /**
   * Get eligibility request details
   * GET /api/eligibility/request/:requestId
   */
  async getRequest(request, reply) {
    try {
      const { requestId } = request.params;

      const requestData = await EligibilityVerifier.getRequest(requestId);

      if (!requestData) {
        return reply.code(404).send({
          success: false,
          error: 'Request not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: requestData
      });
    } catch (error) {
      logger.error('Error getting request:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get benefit details for response
   * GET /api/eligibility/benefits/:responseId
   */
  async getBenefitDetails(request, reply) {
    try {
      const { responseId } = request.params;

      const benefits = await EligibilityVerifier.getBenefitDetails(parseInt(responseId));

      return reply.code(200).send({
        success: true,
        count: benefits.length,
        data: benefits
      });
    } catch (error) {
      logger.error('Error getting benefit details:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Mark patient for reverification
   * POST /api/eligibility/mark-reverification
   */
  async markForReverification(request, reply) {
    try {
      const { patientId, reason } = request.body;

      if (!patientId) {
        return reply.code(400).send({
          success: false,
          error: 'Patient ID is required'
        });
      }

      await EligibilityVerifier.markForReverification(
        patientId,
        reason || 'Manual reverification requested'
      );

      return reply.code(200).send({
        success: true,
        message: 'Patient marked for reverification'
      });
    } catch (error) {
      logger.error('Error marking for reverification:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }
}

export default new EligibilityController();
