import ASC606Controller from '../controllers/ASC606.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * ASC 606 Revenue Recognition Routes
 *
 * Implements the FASB ASC 606 five-step model for revenue recognition
 * All routes require authentication and specific permissions
 */
export default async function asc606Routes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // CONTRACTS (STEP 1)
  // ============================================

  /**
   * Create ASC 606 contract
   * POST /api/asc606/contracts
   */
  fastify.post(
    '/contracts',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create ASC 606 compliant contract',
        tags: ['ASC 606 Revenue Recognition'],
        body: {
          type: 'object',
          required: ['payer_id', 'contract_number', 'contract_type', 'contract_start_date'],
          properties: {
            payer_id: { type: 'number' },
            patient_id: { type: 'number' },
            billing_contract_id: { type: 'number' },
            contract_number: { type: 'string' },
            contract_name: { type: 'string' },
            contract_type: {
              type: 'string',
              enum: ['SERVICE_AGREEMENT', 'CAPITATION', 'FEE_FOR_SERVICE', 'BUNDLED_PAYMENT']
            },
            contract_start_date: { type: 'string', format: 'date' },
            contract_end_date: { type: 'string', format: 'date' },
            is_evergreen: { type: 'boolean' },
            total_contract_value: { type: 'number' },
            criteria_approval_commitment: { type: 'boolean' },
            criteria_rights_identified: { type: 'boolean' },
            criteria_payment_terms_identified: { type: 'boolean' },
            criteria_commercial_substance: { type: 'boolean' },
            criteria_collection_probable: { type: 'boolean' }
          }
        }
      }
    },
    ASC606Controller.createContract.bind(ASC606Controller)
  );

  /**
   * List contracts
   * GET /api/asc606/contracts
   */
  fastify.get(
    '/contracts',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List ASC 606 contracts',
        tags: ['ASC 606 Revenue Recognition'],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            payerId: { type: 'number' },
            validOnly: { type: 'string', enum: ['true', 'false'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 }
          }
        }
      }
    },
    ASC606Controller.listContracts.bind(ASC606Controller)
  );

  /**
   * Get contract details
   * GET /api/asc606/contracts/:id
   */
  fastify.get(
    '/contracts/:id',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get ASC 606 contract with related data',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.getContract.bind(ASC606Controller)
  );

  /**
   * Update contract
   * PUT /api/asc606/contracts/:id
   */
  fastify.put(
    '/contracts/:id',
    {
      preHandler: checkPermission('revenue:update'),
      schema: {
        description: 'Update ASC 606 contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.updateContract.bind(ASC606Controller)
  );

  /**
   * Validate contract
   * POST /api/asc606/contracts/:id/validate
   */
  fastify.post(
    '/contracts/:id/validate',
    {
      preHandler: checkPermission('revenue:validate'),
      schema: {
        description: 'Validate contract against ASC 606 criteria',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        body: {
          type: 'object',
          properties: {
            validationNotes: { type: 'string' }
          }
        }
      }
    },
    ASC606Controller.validateContract.bind(ASC606Controller)
  );

  // ============================================
  // PERFORMANCE OBLIGATIONS (STEP 2)
  // ============================================

  /**
   * Create performance obligation
   * POST /api/asc606/contracts/:id/obligations
   */
  fastify.post(
    '/contracts/:id/obligations',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create performance obligation for contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        body: {
          type: 'object',
          required: ['obligation_number', 'obligation_name', 'obligation_type', 'satisfaction_pattern', 'recognition_pattern', 'obligation_start_date'],
          properties: {
            obligation_number: { type: 'string' },
            obligation_name: { type: 'string' },
            obligation_description: { type: 'string' },
            obligation_type: {
              type: 'string',
              enum: ['HOSPICE_ROUTINE_CARE', 'HOSPICE_CONTINUOUS_CARE', 'HOSPICE_RESPITE_CARE', 'HOSPICE_INPATIENT_CARE', 'DME_EQUIPMENT', 'PHARMACY_SERVICES', 'SKILLED_NURSING', 'THERAPY_SERVICES', 'ADMINISTRATIVE_SERVICES', 'BUNDLED_SERVICES']
            },
            satisfaction_pattern: {
              type: 'string',
              enum: ['POINT_IN_TIME', 'OVER_TIME_OUTPUT', 'OVER_TIME_INPUT', 'STRAIGHT_LINE']
            },
            recognition_pattern: {
              type: 'string',
              enum: ['STRAIGHT_LINE', 'USAGE_BASED', 'MILESTONE_BASED', 'PERCENTAGE_OF_COMPLETION']
            },
            obligation_start_date: { type: 'string', format: 'date' },
            obligation_end_date: { type: 'string', format: 'date' },
            expected_duration_days: { type: 'number' },
            standalone_selling_price: { type: 'number' },
            ssp_method: { type: 'string' }
          }
        }
      }
    },
    ASC606Controller.createObligation.bind(ASC606Controller)
  );

  /**
   * List performance obligations
   * GET /api/asc606/contracts/:id/obligations
   */
  fastify.get(
    '/contracts/:id/obligations',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List performance obligations for contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' }
          }
        }
      }
    },
    ASC606Controller.listObligations.bind(ASC606Controller)
  );

  /**
   * Update performance obligation
   * PUT /api/asc606/obligations/:id
   */
  fastify.put(
    '/obligations/:id',
    {
      preHandler: checkPermission('revenue:update'),
      schema: {
        description: 'Update performance obligation',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.updateObligation.bind(ASC606Controller)
  );

  // ============================================
  // TRANSACTION PRICES (STEP 3)
  // ============================================

  /**
   * Create transaction price
   * POST /api/asc606/contracts/:id/prices
   */
  fastify.post(
    '/contracts/:id/prices',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create/update transaction price for contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        body: {
          type: 'object',
          required: ['effective_date', 'fixed_consideration', 'total_transaction_price'],
          properties: {
            effective_date: { type: 'string', format: 'date' },
            fixed_consideration: { type: 'number' },
            has_variable_consideration: { type: 'boolean' },
            variable_consideration_estimate: { type: 'number' },
            variable_consideration_method: { type: 'string', enum: ['EXPECTED_VALUE', 'MOST_LIKELY_AMOUNT'] },
            constraint_applied: { type: 'boolean' },
            constrained_amount: { type: 'number' },
            total_transaction_price: { type: 'number' },
            financing_adjustment: { type: 'number' },
            non_cash_fair_value: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.createTransactionPrice.bind(ASC606Controller)
  );

  /**
   * Get transaction price history
   * GET /api/asc606/contracts/:id/prices
   */
  fastify.get(
    '/contracts/:id/prices',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get transaction price history for contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            currentOnly: { type: 'string', enum: ['true', 'false'] }
          }
        }
      }
    },
    ASC606Controller.getTransactionPrices.bind(ASC606Controller)
  );

  // ============================================
  // PRICE ALLOCATIONS (STEP 4)
  // ============================================

  /**
   * Allocate prices to obligations
   * POST /api/asc606/contracts/:id/allocate
   */
  fastify.post(
    '/contracts/:id/allocate',
    {
      preHandler: checkPermission('revenue:allocate'),
      schema: {
        description: 'Allocate transaction price to performance obligations',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        body: {
          type: 'object',
          required: ['allocations'],
          properties: {
            effective_date: { type: 'string', format: 'date' },
            allocations: {
              type: 'array',
              items: {
                type: 'object',
                required: ['obligation_id', 'standalone_selling_price', 'ssp_determination_method'],
                properties: {
                  obligation_id: { type: 'number' },
                  standalone_selling_price: { type: 'number' },
                  ssp_determination_method: {
                    type: 'string',
                    enum: ['OBSERVABLE_STANDALONE', 'ADJUSTED_MARKET_ASSESSMENT', 'EXPECTED_COST_PLUS_MARGIN', 'RESIDUAL']
                  },
                  ssp_observable_source: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    ASC606Controller.allocatePrices.bind(ASC606Controller)
  );

  /**
   * Get price allocations
   * GET /api/asc606/contracts/:id/allocations
   */
  fastify.get(
    '/contracts/:id/allocations',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get price allocations for contract',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            currentOnly: { type: 'string', enum: ['true', 'false'] }
          }
        }
      }
    },
    ASC606Controller.getAllocations.bind(ASC606Controller)
  );

  // ============================================
  // DAILY ACCRUALS (STEP 5)
  // ============================================

  /**
   * Calculate daily accruals
   * POST /api/asc606/accruals/calculate
   */
  fastify.post(
    '/accruals/calculate',
    {
      preHandler: checkPermission('revenue:calculate'),
      schema: {
        description: 'Calculate daily revenue accruals for date range',
        tags: ['ASC 606 Revenue Recognition'],
        body: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            contractId: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.calculateDailyAccruals.bind(ASC606Controller)
  );

  /**
   * Get accruals
   * GET /api/asc606/accruals
   */
  fastify.get(
    '/accruals',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get daily revenue accruals',
        tags: ['ASC 606 Revenue Recognition'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            period: { type: 'string' },
            contractId: { type: 'number' },
            status: { type: 'string' },
            limit: { type: 'number', default: 100 },
            offset: { type: 'number', default: 0 }
          }
        }
      }
    },
    ASC606Controller.getAccruals.bind(ASC606Controller)
  );

  // ============================================
  // CONTRACT MODIFICATIONS
  // ============================================

  /**
   * Create contract modification
   * POST /api/asc606/contracts/:id/modifications
   */
  fastify.post(
    '/contracts/:id/modifications',
    {
      preHandler: checkPermission('revenue:modify'),
      schema: {
        description: 'Create contract modification',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        },
        body: {
          type: 'object',
          required: ['modification_number', 'modification_date', 'effective_date', 'modification_type'],
          properties: {
            modification_number: { type: 'string' },
            modification_date: { type: 'string', format: 'date' },
            effective_date: { type: 'string', format: 'date' },
            modification_type: {
              type: 'string',
              enum: ['SEPARATE_CONTRACT', 'TERMINATION_AND_NEW', 'CONTINUATION']
            },
            modification_description: { type: 'string' },
            scope_change: { type: 'string' },
            price_change: { type: 'string' },
            new_total_price: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.createModification.bind(ASC606Controller)
  );

  /**
   * List contract modifications
   * GET /api/asc606/contracts/:id/modifications
   */
  fastify.get(
    '/contracts/:id/modifications',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List contract modifications',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number' }
          }
        }
      }
    },
    ASC606Controller.listModifications.bind(ASC606Controller)
  );

  // ============================================
  // RECONCILIATION
  // ============================================

  /**
   * Create reconciliation
   * POST /api/asc606/reconciliation
   */
  fastify.post(
    '/reconciliation',
    {
      preHandler: checkPermission('revenue:reconcile'),
      schema: {
        description: 'Create period reconciliation',
        tags: ['ASC 606 Revenue Recognition'],
        body: {
          type: 'object',
          required: ['period_label', 'fiscal_year', 'fiscal_quarter', 'total_recognized_revenue', 'total_billed_revenue'],
          properties: {
            period_label: { type: 'string' },
            fiscal_year: { type: 'number' },
            fiscal_quarter: { type: 'number' },
            total_recognized_revenue: { type: 'number' },
            total_billed_revenue: { type: 'number' },
            deferred_revenue_beginning: { type: 'number' },
            deferred_revenue_ending: { type: 'number' },
            unbilled_receivables_beginning: { type: 'number' },
            unbilled_receivables_ending: { type: 'number' },
            variance_explanation: { type: 'string' }
          }
        }
      }
    },
    ASC606Controller.createReconciliation.bind(ASC606Controller)
  );

  /**
   * Get period reconciliation
   * GET /api/asc606/reconciliation/:period
   */
  fastify.get(
    '/reconciliation/:period',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get period reconciliation',
        tags: ['ASC 606 Revenue Recognition'],
        params: {
          type: 'object',
          required: ['period'],
          properties: {
            period: { type: 'string' }
          }
        }
      }
    },
    ASC606Controller.getReconciliation.bind(ASC606Controller)
  );
}
