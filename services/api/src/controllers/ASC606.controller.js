import { db } from '../config/db.drizzle.js';
import {
  asc606_contracts,
  asc606_performance_obligations,
  asc606_transaction_prices,
  asc606_variable_consideration,
  asc606_price_allocations,
  asc606_daily_revenue_accruals,
  asc606_contract_modifications,
  asc606_revenue_schedules,
  asc606_deferrals,
  asc606_calculation_audit,
  asc606_reconciliation
} from '../db/schemas/index.js';
import { eq, and, between, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * ASC 606 Revenue Recognition Controller
 *
 * Implements the FASB ASC 606 five-step model for revenue recognition:
 * 1. Identify the contract with a customer
 * 2. Identify the performance obligations in the contract
 * 3. Determine the transaction price
 * 4. Allocate the transaction price to performance obligations
 * 5. Recognize revenue when (or as) the entity satisfies a performance obligation
 *
 * Endpoints:
 *   Contracts (Step 1):
 *     - POST   /asc606/contracts                    - Create contract
 *     - GET    /asc606/contracts                    - List contracts
 *     - GET    /asc606/contracts/:id                - Get contract details
 *     - PUT    /asc606/contracts/:id                - Update contract
 *     - POST   /asc606/contracts/:id/validate       - Validate contract criteria
 *
 *   Performance Obligations (Step 2):
 *     - POST   /asc606/contracts/:id/obligations    - Create obligation
 *     - GET    /asc606/contracts/:id/obligations    - List obligations
 *     - PUT    /asc606/obligations/:id              - Update obligation
 *
 *   Transaction Prices (Step 3):
 *     - POST   /asc606/contracts/:id/prices         - Create/update price
 *     - GET    /asc606/contracts/:id/prices         - Get price history
 *
 *   Price Allocations (Step 4):
 *     - POST   /asc606/contracts/:id/allocate       - Allocate prices
 *     - GET    /asc606/contracts/:id/allocations    - Get allocations
 *
 *   Daily Accruals (Step 5):
 *     - POST   /asc606/accruals/calculate           - Calculate daily accruals
 *     - GET    /asc606/accruals                     - Get accruals for period
 *     - GET    /asc606/contracts/:id/accruals       - Get contract accruals
 *
 *   Contract Modifications:
 *     - POST   /asc606/contracts/:id/modifications  - Create modification
 *     - GET    /asc606/contracts/:id/modifications  - List modifications
 *
 *   Reconciliation:
 *     - POST   /asc606/reconciliation               - Create reconciliation
 *     - GET    /asc606/reconciliation/:period       - Get period reconciliation
 */

class ASC606Controller {
  // ============================================
  // CONTRACTS (STEP 1)
  // ============================================

  /**
   * POST /api/asc606/contracts
   * Create a new ASC 606 contract
   */
  async createContract(req, res) {
    try {
      const userId = req.user.id;
      const contractData = req.body;

      // Validate all 5 ASC 606 criteria and set is_valid_asc606_contract
      const isValidContract =
        contractData.criteria_approval_commitment &&
        contractData.criteria_rights_identified &&
        contractData.criteria_payment_terms_identified &&
        contractData.criteria_commercial_substance &&
        contractData.criteria_collection_probable;

      const [contract] = await db.insert(asc606_contracts).values({
        ...contractData,
        is_valid_asc606_contract: isValidContract,
        validation_date: isValidContract ? new Date() : null,
        contract_status: isValidContract ? 'ACTIVE' : 'PENDING_VALIDATION',
        created_by_id: userId,
        updated_by_id: userId
      }).returning();

      // Create audit entry
      await this._createAuditEntry({
        contract_id: contract.id,
        event_type: 'CALCULATION',
        event_date: new Date().toISOString().split('T')[0],
        event_description: `Contract ${contract.contract_number} created`,
        after_state: contract,
        trigger_source: 'MANUAL_ENTRY',
        created_by_id: userId
      });

      res.status(201).json({
        success: true,
        message: 'ASC 606 contract created successfully',
        data: contract
      });
    } catch (error) {
      logger.error('Error creating ASC 606 contract:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create contract',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts
   * List contracts with filters
   */
  async listContracts(req, res) {
    try {
      const { status, payerId, validOnly, startDate, endDate, limit = 50, offset = 0 } = req.query;

      let query = db.select().from(asc606_contracts);
      const conditions = [];

      if (status) {
        conditions.push(eq(asc606_contracts.contract_status, status));
      }
      if (payerId) {
        conditions.push(eq(asc606_contracts.payer_id, parseInt(payerId)));
      }
      if (validOnly === 'true') {
        conditions.push(eq(asc606_contracts.is_valid_asc606_contract, true));
      }
      if (startDate) {
        conditions.push(gte(asc606_contracts.contract_start_date, startDate));
      }
      if (endDate) {
        conditions.push(lte(asc606_contracts.contract_end_date, endDate));
      }
      conditions.push(sql`${asc606_contracts.deleted_at} IS NULL`);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const contracts = await query
        .orderBy(desc(asc606_contracts.created_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      res.json({
        success: true,
        count: contracts.length,
        data: contracts
      });
    } catch (error) {
      logger.error('Error listing ASC 606 contracts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list contracts',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts/:id
   * Get contract with all related data
   */
  async getContract(req, res) {
    try {
      const { id } = req.params;

      const [contract] = await db.select()
        .from(asc606_contracts)
        .where(eq(asc606_contracts.id, parseInt(id)));

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Get related data
      const obligations = await db.select()
        .from(asc606_performance_obligations)
        .where(eq(asc606_performance_obligations.contract_id, parseInt(id)));

      const transactionPrices = await db.select()
        .from(asc606_transaction_prices)
        .where(and(
          eq(asc606_transaction_prices.contract_id, parseInt(id)),
          eq(asc606_transaction_prices.is_current, true)
        ));

      const allocations = await db.select()
        .from(asc606_price_allocations)
        .where(and(
          eq(asc606_price_allocations.contract_id, parseInt(id)),
          eq(asc606_price_allocations.is_current, true)
        ));

      res.json({
        success: true,
        data: {
          contract,
          obligations,
          transactionPrice: transactionPrices[0] || null,
          allocations
        }
      });
    } catch (error) {
      logger.error('Error getting ASC 606 contract:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get contract',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/asc606/contracts/:id
   * Update contract
   */
  async updateContract(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Get current state for audit
      const [currentContract] = await db.select()
        .from(asc606_contracts)
        .where(eq(asc606_contracts.id, parseInt(id)));

      if (!currentContract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Recalculate validity if criteria changed
      const isValidContract =
        (updateData.criteria_approval_commitment ?? currentContract.criteria_approval_commitment) &&
        (updateData.criteria_rights_identified ?? currentContract.criteria_rights_identified) &&
        (updateData.criteria_payment_terms_identified ?? currentContract.criteria_payment_terms_identified) &&
        (updateData.criteria_commercial_substance ?? currentContract.criteria_commercial_substance) &&
        (updateData.criteria_collection_probable ?? currentContract.criteria_collection_probable);

      const [updatedContract] = await db.update(asc606_contracts)
        .set({
          ...updateData,
          is_valid_asc606_contract: isValidContract,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(asc606_contracts.id, parseInt(id)))
        .returning();

      // Create audit entry
      await this._createAuditEntry({
        contract_id: parseInt(id),
        event_type: 'ADJUSTMENT',
        event_date: new Date().toISOString().split('T')[0],
        event_description: `Contract ${currentContract.contract_number} updated`,
        before_state: currentContract,
        after_state: updatedContract,
        trigger_source: 'MANUAL_ENTRY',
        created_by_id: userId
      });

      res.json({
        success: true,
        message: 'Contract updated successfully',
        data: updatedContract
      });
    } catch (error) {
      logger.error('Error updating ASC 606 contract:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update contract',
        message: error.message
      });
    }
  }

  /**
   * POST /api/asc606/contracts/:id/validate
   * Validate contract against ASC 606 criteria
   */
  async validateContract(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { validationNotes } = req.body;

      const [contract] = await db.select()
        .from(asc606_contracts)
        .where(eq(asc606_contracts.id, parseInt(id)));

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      // Check all 5 criteria
      const criteria = {
        approval_commitment: contract.criteria_approval_commitment,
        rights_identified: contract.criteria_rights_identified,
        payment_terms_identified: contract.criteria_payment_terms_identified,
        commercial_substance: contract.criteria_commercial_substance,
        collection_probable: contract.criteria_collection_probable
      };

      const isValid = Object.values(criteria).every(v => v === true);
      const failedCriteria = Object.entries(criteria)
        .filter(([, v]) => !v)
        .map(([k]) => k);

      const [updatedContract] = await db.update(asc606_contracts)
        .set({
          is_valid_asc606_contract: isValid,
          validation_date: new Date(),
          validation_notes: validationNotes || null,
          contract_status: isValid ? 'ACTIVE' : 'PENDING_VALIDATION',
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(asc606_contracts.id, parseInt(id)))
        .returning();

      res.json({
        success: true,
        message: isValid ? 'Contract validated successfully' : 'Contract validation failed',
        data: {
          contract: updatedContract,
          criteria,
          isValid,
          failedCriteria
        }
      });
    } catch (error) {
      logger.error('Error validating ASC 606 contract:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate contract',
        message: error.message
      });
    }
  }

  // ============================================
  // PERFORMANCE OBLIGATIONS (STEP 2)
  // ============================================

  /**
   * POST /api/asc606/contracts/:id/obligations
   * Create performance obligation
   */
  async createObligation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const obligationData = req.body;

      // Verify contract exists
      const [contract] = await db.select()
        .from(asc606_contracts)
        .where(eq(asc606_contracts.id, parseInt(id)));

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      const [obligation] = await db.insert(asc606_performance_obligations).values({
        ...obligationData,
        contract_id: parseInt(id),
        created_by_id: userId,
        updated_by_id: userId
      }).returning();

      res.status(201).json({
        success: true,
        message: 'Performance obligation created successfully',
        data: obligation
      });
    } catch (error) {
      logger.error('Error creating performance obligation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create performance obligation',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts/:id/obligations
   * List performance obligations for contract
   */
  async listObligations(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.query;

      let query = db.select()
        .from(asc606_performance_obligations)
        .where(eq(asc606_performance_obligations.contract_id, parseInt(id)));

      if (status) {
        query = query.where(and(
          eq(asc606_performance_obligations.contract_id, parseInt(id)),
          eq(asc606_performance_obligations.satisfaction_status, status)
        ));
      }

      const obligations = await query.orderBy(asc606_performance_obligations.obligation_number);

      res.json({
        success: true,
        count: obligations.length,
        data: obligations
      });
    } catch (error) {
      logger.error('Error listing performance obligations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list performance obligations',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/asc606/obligations/:id
   * Update performance obligation
   */
  async updateObligation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const [updatedObligation] = await db.update(asc606_performance_obligations)
        .set({
          ...updateData,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(asc606_performance_obligations.id, parseInt(id)))
        .returning();

      if (!updatedObligation) {
        return res.status(404).json({
          success: false,
          error: 'Obligation not found'
        });
      }

      res.json({
        success: true,
        message: 'Performance obligation updated successfully',
        data: updatedObligation
      });
    } catch (error) {
      logger.error('Error updating performance obligation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update performance obligation',
        message: error.message
      });
    }
  }

  // ============================================
  // TRANSACTION PRICES (STEP 3)
  // ============================================

  /**
   * POST /api/asc606/contracts/:id/prices
   * Create or update transaction price
   */
  async createTransactionPrice(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const priceData = req.body;

      // Mark any existing current price as superseded
      await db.update(asc606_transaction_prices)
        .set({
          is_current: false,
          superseded_date: priceData.effective_date
        })
        .where(and(
          eq(asc606_transaction_prices.contract_id, parseInt(id)),
          eq(asc606_transaction_prices.is_current, true)
        ));

      // Get current version
      const [latestPrice] = await db.select()
        .from(asc606_transaction_prices)
        .where(eq(asc606_transaction_prices.contract_id, parseInt(id)))
        .orderBy(desc(asc606_transaction_prices.version))
        .limit(1);

      const newVersion = (latestPrice?.version || 0) + 1;

      const [transactionPrice] = await db.insert(asc606_transaction_prices).values({
        ...priceData,
        contract_id: parseInt(id),
        version: newVersion,
        is_current: true,
        created_by_id: userId
      }).returning();

      res.status(201).json({
        success: true,
        message: 'Transaction price created successfully',
        data: transactionPrice
      });
    } catch (error) {
      logger.error('Error creating transaction price:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create transaction price',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts/:id/prices
   * Get transaction price history
   */
  async getTransactionPrices(req, res) {
    try {
      const { id } = req.params;
      const { currentOnly } = req.query;

      let query = db.select()
        .from(asc606_transaction_prices)
        .where(eq(asc606_transaction_prices.contract_id, parseInt(id)));

      if (currentOnly === 'true') {
        query = query.where(and(
          eq(asc606_transaction_prices.contract_id, parseInt(id)),
          eq(asc606_transaction_prices.is_current, true)
        ));
      }

      const prices = await query.orderBy(desc(asc606_transaction_prices.version));

      res.json({
        success: true,
        count: prices.length,
        data: prices
      });
    } catch (error) {
      logger.error('Error getting transaction prices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transaction prices',
        message: error.message
      });
    }
  }

  // ============================================
  // PRICE ALLOCATIONS (STEP 4)
  // ============================================

  /**
   * POST /api/asc606/contracts/:id/allocate
   * Allocate transaction price to performance obligations
   */
  async allocatePrices(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { allocations, effective_date } = req.body;

      // Get current transaction price
      const [transactionPrice] = await db.select()
        .from(asc606_transaction_prices)
        .where(and(
          eq(asc606_transaction_prices.contract_id, parseInt(id)),
          eq(asc606_transaction_prices.is_current, true)
        ));

      if (!transactionPrice) {
        return res.status(400).json({
          success: false,
          error: 'No current transaction price found for contract'
        });
      }

      // Mark existing allocations as not current
      await db.update(asc606_price_allocations)
        .set({ is_current: false })
        .where(and(
          eq(asc606_price_allocations.contract_id, parseInt(id)),
          eq(asc606_price_allocations.is_current, true)
        ));

      // Calculate total SSP for relative allocation
      const totalSSP = allocations.reduce((sum, a) => sum + a.standalone_selling_price, 0);

      // Create new allocations
      const createdAllocations = [];
      for (const alloc of allocations) {
        const relativeSspPercentage = Math.round((alloc.standalone_selling_price / totalSSP) * 10000);
        const allocatedAmount = Math.round((transactionPrice.total_transaction_price * relativeSspPercentage) / 10000);

        // Calculate daily accrual rate
        const obligation = await db.select()
          .from(asc606_performance_obligations)
          .where(eq(asc606_performance_obligations.id, alloc.obligation_id));

        let dailyAccrualRate = null;
        if (obligation[0]?.expected_duration_days) {
          dailyAccrualRate = Math.round(allocatedAmount / obligation[0].expected_duration_days);
        }

        const [allocation] = await db.insert(asc606_price_allocations).values({
          contract_id: parseInt(id),
          transaction_price_id: transactionPrice.id,
          obligation_id: alloc.obligation_id,
          effective_date: effective_date || new Date().toISOString().split('T')[0],
          standalone_selling_price: alloc.standalone_selling_price,
          ssp_determination_method: alloc.ssp_determination_method,
          ssp_observable_source: alloc.ssp_observable_source,
          relative_ssp_percentage: relativeSspPercentage,
          allocated_amount: allocatedAmount,
          daily_accrual_rate: dailyAccrualRate,
          is_current: true,
          created_by_id: userId
        }).returning();

        createdAllocations.push(allocation);

        // Update obligation with allocated price
        await db.update(asc606_performance_obligations)
          .set({
            allocated_price: allocatedAmount,
            allocation_percentage: relativeSspPercentage,
            updated_by_id: userId,
            updated_at: new Date()
          })
          .where(eq(asc606_performance_obligations.id, alloc.obligation_id));
      }

      res.status(201).json({
        success: true,
        message: 'Price allocations created successfully',
        data: {
          totalTransactionPrice: transactionPrice.total_transaction_price,
          totalSSP,
          allocations: createdAllocations
        }
      });
    } catch (error) {
      logger.error('Error allocating prices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to allocate prices',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts/:id/allocations
   * Get price allocations
   */
  async getAllocations(req, res) {
    try {
      const { id } = req.params;
      const { currentOnly } = req.query;

      let conditions = [eq(asc606_price_allocations.contract_id, parseInt(id))];
      if (currentOnly === 'true') {
        conditions.push(eq(asc606_price_allocations.is_current, true));
      }

      const allocations = await db.select()
        .from(asc606_price_allocations)
        .where(and(...conditions))
        .orderBy(asc606_price_allocations.obligation_id);

      res.json({
        success: true,
        count: allocations.length,
        data: allocations
      });
    } catch (error) {
      logger.error('Error getting allocations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get allocations',
        message: error.message
      });
    }
  }

  // ============================================
  // DAILY ACCRUALS (STEP 5)
  // ============================================

  /**
   * POST /api/asc606/accruals/calculate
   * Calculate daily revenue accruals for a date range
   */
  async calculateDailyAccruals(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, contractId } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      // Get active contracts with allocations
      let contractQuery = db.select()
        .from(asc606_contracts)
        .where(and(
          eq(asc606_contracts.is_valid_asc606_contract, true),
          eq(asc606_contracts.contract_status, 'ACTIVE')
        ));

      if (contractId) {
        contractQuery = contractQuery.where(eq(asc606_contracts.id, parseInt(contractId)));
      }

      const contracts = await contractQuery;
      const accrualResults = [];

      for (const contract of contracts) {
        // Get current allocations
        const allocations = await db.select()
          .from(asc606_price_allocations)
          .where(and(
            eq(asc606_price_allocations.contract_id, contract.id),
            eq(asc606_price_allocations.is_current, true)
          ));

        for (const allocation of allocations) {
          // Get the obligation
          const [obligation] = await db.select()
            .from(asc606_performance_obligations)
            .where(eq(asc606_performance_obligations.id, allocation.obligation_id));

          if (!obligation) continue;

          // Calculate accruals for each day in range
          const start = new Date(startDate);
          const end = new Date(endDate);

          for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const accrualDate = date.toISOString().split('T')[0];

            // Skip if outside obligation period
            if (accrualDate < obligation.obligation_start_date) continue;
            if (obligation.obligation_end_date && accrualDate > obligation.obligation_end_date) continue;

            // Check if accrual already exists
            const [existingAccrual] = await db.select()
              .from(asc606_daily_revenue_accruals)
              .where(and(
                eq(asc606_daily_revenue_accruals.contract_id, contract.id),
                eq(asc606_daily_revenue_accruals.obligation_id, obligation.id),
                eq(asc606_daily_revenue_accruals.accrual_date, accrualDate)
              ));

            if (existingAccrual) continue;

            // Calculate daily amount
            const dailyRate = allocation.daily_accrual_rate || 0;
            const fiscalInfo = this._getFiscalInfo(new Date(accrualDate));
            const isLeapYear = this._isLeapYear(fiscalInfo.fiscalYear);
            const daysInMonth = this._getDaysInMonth(new Date(accrualDate));

            // Check for partial periods
            const isPartialPeriod =
              accrualDate === obligation.obligation_start_date ||
              accrualDate === obligation.obligation_end_date;

            // Get cumulative amounts
            const [cumulativeResult] = await db.select({
              total: sql`COALESCE(SUM(adjusted_daily_amount), 0)`
            })
              .from(asc606_daily_revenue_accruals)
              .where(and(
                eq(asc606_daily_revenue_accruals.contract_id, contract.id),
                eq(asc606_daily_revenue_accruals.obligation_id, obligation.id),
                sql`${asc606_daily_revenue_accruals.accrual_date} < ${accrualDate}`
              ));

            const cumulativeRecognized = Number(cumulativeResult?.total || 0) + dailyRate;
            const remainingToRecognize = allocation.allocated_amount - cumulativeRecognized;
            const satisfactionPercentage = Math.round((cumulativeRecognized / allocation.allocated_amount) * 10000);

            const [accrual] = await db.insert(asc606_daily_revenue_accruals).values({
              contract_id: contract.id,
              obligation_id: obligation.id,
              allocation_id: allocation.id,
              patient_id: contract.patient_id,
              accrual_date: accrualDate,
              fiscal_year: fiscalInfo.fiscalYear,
              fiscal_quarter: fiscalInfo.fiscalQuarter,
              fiscal_month: fiscalInfo.fiscalMonth,
              period_label: fiscalInfo.periodLabel,
              is_leap_year: isLeapYear,
              days_in_month: daysInMonth,
              is_partial_period: isPartialPeriod,
              recognition_pattern: obligation.recognition_pattern,
              base_daily_rate: dailyRate,
              adjustment_factor: 10000, // 100%
              adjusted_daily_amount: dailyRate,
              cumulative_recognized: cumulativeRecognized,
              remaining_to_recognize: remainingToRecognize > 0 ? remainingToRecognize : 0,
              satisfaction_percentage: satisfactionPercentage,
              status: 'CALCULATED',
              calculation_timestamp: new Date(),
              calculation_source: 'AUTOMATED_DAILY_JOB',
              created_by_id: userId
            }).returning();

            accrualResults.push(accrual);
          }
        }
      }

      res.status(201).json({
        success: true,
        message: `Calculated ${accrualResults.length} daily accruals`,
        data: {
          count: accrualResults.length,
          dateRange: { startDate, endDate },
          contractsProcessed: contracts.length
        }
      });
    } catch (error) {
      logger.error('Error calculating daily accruals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate daily accruals',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/accruals
   * Get accruals for period
   */
  async getAccruals(req, res) {
    try {
      const { startDate, endDate, period, contractId, status, limit = 100, offset = 0 } = req.query;

      const conditions = [];

      if (startDate && endDate) {
        conditions.push(between(asc606_daily_revenue_accruals.accrual_date, startDate, endDate));
      }
      if (period) {
        conditions.push(eq(asc606_daily_revenue_accruals.period_label, period));
      }
      if (contractId) {
        conditions.push(eq(asc606_daily_revenue_accruals.contract_id, parseInt(contractId)));
      }
      if (status) {
        conditions.push(eq(asc606_daily_revenue_accruals.status, status));
      }

      let query = db.select().from(asc606_daily_revenue_accruals);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const accruals = await query
        .orderBy(desc(asc606_daily_revenue_accruals.accrual_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get summary
      const [summary] = await db.select({
        total_recognized: sql`SUM(adjusted_daily_amount)`,
        count: sql`COUNT(*)`
      })
        .from(asc606_daily_revenue_accruals)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      res.json({
        success: true,
        count: accruals.length,
        summary: {
          totalRecognized: Number(summary?.total_recognized || 0),
          totalRecords: Number(summary?.count || 0)
        },
        data: accruals
      });
    } catch (error) {
      logger.error('Error getting accruals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get accruals',
        message: error.message
      });
    }
  }

  // ============================================
  // CONTRACT MODIFICATIONS
  // ============================================

  /**
   * POST /api/asc606/contracts/:id/modifications
   * Create contract modification
   */
  async createModification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const modificationData = req.body;

      // Get current contract state
      const [contract] = await db.select()
        .from(asc606_contracts)
        .where(eq(asc606_contracts.id, parseInt(id)));

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
      }

      const [modification] = await db.insert(asc606_contract_modifications).values({
        ...modificationData,
        contract_id: parseInt(id),
        previous_total_price: contract.total_contract_value,
        modification_status: 'PENDING',
        created_by_id: userId
      }).returning();

      res.status(201).json({
        success: true,
        message: 'Contract modification created successfully',
        data: modification
      });
    } catch (error) {
      logger.error('Error creating contract modification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create modification',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/contracts/:id/modifications
   * List contract modifications
   */
  async listModifications(req, res) {
    try {
      const { id } = req.params;

      const modifications = await db.select()
        .from(asc606_contract_modifications)
        .where(eq(asc606_contract_modifications.contract_id, parseInt(id)))
        .orderBy(desc(asc606_contract_modifications.modification_date));

      res.json({
        success: true,
        count: modifications.length,
        data: modifications
      });
    } catch (error) {
      logger.error('Error listing modifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list modifications',
        message: error.message
      });
    }
  }

  // ============================================
  // RECONCILIATION
  // ============================================

  /**
   * POST /api/asc606/reconciliation
   * Create period reconciliation
   */
  async createReconciliation(req, res) {
    try {
      const userId = req.user.id;
      const reconciliationData = req.body;

      const [reconciliation] = await db.insert(asc606_reconciliation).values({
        ...reconciliationData,
        variance_amount: reconciliationData.total_recognized_revenue - reconciliationData.total_billed_revenue,
        variance_percentage: Math.round(
          ((reconciliationData.total_recognized_revenue - reconciliationData.total_billed_revenue) /
           reconciliationData.total_billed_revenue) * 10000
        ),
        status: 'DRAFT',
        created_by_id: userId
      }).returning();

      res.status(201).json({
        success: true,
        message: 'Reconciliation created successfully',
        data: reconciliation
      });
    } catch (error) {
      logger.error('Error creating reconciliation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create reconciliation',
        message: error.message
      });
    }
  }

  /**
   * GET /api/asc606/reconciliation/:period
   * Get period reconciliation
   */
  async getReconciliation(req, res) {
    try {
      const { period } = req.params;

      const [reconciliation] = await db.select()
        .from(asc606_reconciliation)
        .where(eq(asc606_reconciliation.period_label, period));

      if (!reconciliation) {
        return res.status(404).json({
          success: false,
          error: 'Reconciliation not found for period'
        });
      }

      res.json({
        success: true,
        data: reconciliation
      });
    } catch (error) {
      logger.error('Error getting reconciliation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reconciliation',
        message: error.message
      });
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  _getFiscalInfo(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    return {
      fiscalYear: year,
      fiscalQuarter: quarter,
      fiscalMonth: month,
      periodLabel: `${year}-${String(month).padStart(2, '0')}`
    };
  }

  _isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  _getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  async _createAuditEntry(data) {
    try {
      await db.insert(asc606_calculation_audit).values({
        ...data,
        event_timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error creating audit entry:', error);
    }
  }
}

export default new ASC606Controller();
