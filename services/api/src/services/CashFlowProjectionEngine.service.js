import { db } from '../db/index.js';
import {
  cash_flow_projections,
  revenue_accruals,
  collection_forecasts,
  payer_payment_patterns
} from '../db/schemas/index.js';
import {
  expense_categories,
  payment_schedules,
  recurring_revenue_streams,
  historical_collection_patterns,
  cash_flow_forecast_periods,
  cash_flow_scenarios,
  cash_flow_audit_log,
  ar_receivables_snapshot,
  ap_payables_snapshot
} from '../db/schemas/cashFlowProjection.schema.js';
import { claims, payers } from '../db/schemas/billing.schema.js';
import { eq, and, gte, lte, sql, desc, asc, isNull, or } from 'drizzle-orm';
import RevenueForecastingService from './RevenueForecasting.service.js';
import { logger } from '../utils/logger.js';

/**
 * Cash Flow Projection Engine Service
 * Comprehensive financial forecasting with payment timing and collection forecasts
 *
 * Features:
 * - Payment schedule management (payroll, rent, vendors)
 * - AR aging-based collection forecasting
 * - Historical collection pattern analysis
 * - Rolling projections (30/60/90 days, quarterly, annual)
 * - Scenario modeling (optimistic/pessimistic)
 * - Key metrics (cash runway, peak funding, days cash on hand)
 * - Seasonal variation handling
 * - Multi-currency support foundation
 * - Audit trail for assumption changes
 */
class CashFlowProjectionEngineService {
  // Collection probability by aging bucket (basis points)
  static COLLECTION_PROBABILITY_BY_AGING = {
    CURRENT: 9500, // 95% for 0-30 days
    DAYS_31_60: 8500, // 85% for 31-60 days
    DAYS_61_90: 7000, // 70% for 61-90 days
    DAYS_91_120: 5000, // 50% for 91-120 days
    OVER_120: 2500 // 25% for 120+ days
  };

  // Default collection timing (percentage collected by week)
  static DEFAULT_COLLECTION_TIMING = {
    week1: 0.15, // 15% in week 1
    week2: 0.20, // 20% in week 2
    week3: 0.25, // 25% in week 3
    week4: 0.20, // 20% in week 4
    week5Plus: 0.20 // 20% after week 4
  };

  // ============================================
  // EXPENSE CATEGORY MANAGEMENT
  // ============================================

  /**
   * Create expense category
   */
  async createExpenseCategory(data, userId = null) {
    try {
      const [category] = await db.insert(expense_categories)
        .values({
          category_code: data.categoryCode,
          category_name: data.categoryName,
          category_type: data.categoryType,
          parent_category_id: data.parentCategoryId || null,
          default_payment_frequency: data.defaultPaymentFrequency,
          is_fixed_expense: data.isFixedExpense || false,
          seasonal_variance_expected: data.seasonalVarianceExpected || false,
          description: data.description,
          metadata: data.metadata,
          created_by_id: userId
        })
        .returning();

      await this.logAudit('EXPENSE_CATEGORY', category.id, 'CREATE', null, null, null, userId);
      return category;
    } catch (error) {
      logger.error('Error creating expense category:', error);
      throw error;
    }
  }

  /**
   * Get all expense categories
   */
  async getExpenseCategories(includeInactive = false) {
    try {
      let query = db.select().from(expense_categories);
      if (!includeInactive) {
        query = query.where(eq(expense_categories.is_active, true));
      }
      return await query.orderBy(expense_categories.category_name);
    } catch (error) {
      logger.error('Error getting expense categories:', error);
      throw error;
    }
  }

  // ============================================
  // PAYMENT SCHEDULE MANAGEMENT
  // ============================================

  /**
   * Create payment schedule for recurring obligations
   */
  async createPaymentSchedule(data, userId = null) {
    try {
      const [schedule] = await db.insert(payment_schedules)
        .values({
          schedule_name: data.scheduleName,
          schedule_type: data.scheduleType,
          expense_category_id: data.expenseCategoryId || null,
          payee_name: data.payeeName,
          payee_id: data.payeeId,
          base_amount: data.baseAmount,
          variable_component: data.variableComponent || 0,
          estimated_total: data.estimatedTotal || data.baseAmount,
          payment_frequency: data.paymentFrequency,
          payment_day: data.paymentDay,
          payment_week: data.paymentWeek,
          next_payment_date: data.nextPaymentDate,
          last_payment_date: data.lastPaymentDate,
          effective_start_date: data.effectiveStartDate,
          effective_end_date: data.effectiveEndDate,
          is_perpetual: data.isPerpetual !== false,
          early_payment_discount_rate: data.earlyPaymentDiscountRate,
          early_payment_discount_days: data.earlyPaymentDiscountDays,
          late_payment_penalty_rate: data.latePenaltyRate,
          grace_period_days: data.gracePeriodDays,
          priority_level: data.priorityLevel || 'NORMAL',
          can_be_deferred: data.canBeDeferred || false,
          max_deferral_days: data.maxDeferralDays,
          notes: data.notes,
          metadata: data.metadata,
          created_by_id: userId
        })
        .returning();

      await this.logAudit('PAYMENT_SCHEDULE', schedule.id, 'CREATE', null, null, null, userId);
      return schedule;
    } catch (error) {
      logger.error('Error creating payment schedule:', error);
      throw error;
    }
  }

  /**
   * Get active payment schedules
   */
  async getActivePaymentSchedules(filters = {}) {
    try {
      let conditions = [eq(payment_schedules.is_active, true)];

      if (filters.scheduleType) {
        conditions.push(eq(payment_schedules.schedule_type, filters.scheduleType));
      }
      if (filters.priorityLevel) {
        conditions.push(eq(payment_schedules.priority_level, filters.priorityLevel));
      }
      if (filters.beforeDate) {
        conditions.push(lte(payment_schedules.next_payment_date, filters.beforeDate));
      }

      return await db.select()
        .from(payment_schedules)
        .where(and(...conditions))
        .orderBy(payment_schedules.next_payment_date);
    } catch (error) {
      logger.error('Error getting payment schedules:', error);
      throw error;
    }
  }

  /**
   * Get payments due within a date range
   */
  async getPaymentsDueInRange(startDate, endDate) {
    try {
      const schedules = await db.select()
        .from(payment_schedules)
        .where(
          and(
            eq(payment_schedules.is_active, true),
            gte(payment_schedules.next_payment_date, startDate),
            lte(payment_schedules.next_payment_date, endDate)
          )
        )
        .orderBy(payment_schedules.next_payment_date);

      // Expand recurring schedules into individual payments
      const payments = [];
      for (const schedule of schedules) {
        const expandedPayments = this.expandScheduleInRange(schedule, startDate, endDate);
        payments.push(...expandedPayments);
      }

      return payments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    } catch (error) {
      logger.error('Error getting payments due in range:', error);
      throw error;
    }
  }

  /**
   * Expand a schedule into individual payment dates within a range
   */
  expandScheduleInRange(schedule, startDate, endDate) {
    const payments = [];
    let currentDate = new Date(schedule.next_payment_date);
    const end = new Date(endDate);
    const start = new Date(startDate);

    while (currentDate <= end) {
      if (currentDate >= start) {
        payments.push({
          scheduleId: schedule.id,
          scheduleName: schedule.schedule_name,
          scheduleType: schedule.schedule_type,
          dueDate: currentDate.toISOString().split('T')[0],
          amount: Number(schedule.estimated_total),
          priorityLevel: schedule.priority_level,
          canBeDeferred: schedule.can_be_deferred,
          earlyDiscountRate: schedule.early_payment_discount_rate,
          earlyDiscountDays: schedule.early_payment_discount_days
        });
      }

      // Calculate next payment date based on frequency
      currentDate = this.getNextPaymentDate(currentDate, schedule.payment_frequency, schedule.payment_day);
    }

    return payments;
  }

  /**
   * Calculate next payment date based on frequency
   */
  getNextPaymentDate(currentDate, frequency, paymentDay) {
    const date = new Date(currentDate);

    switch (frequency) {
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'BIWEEKLY':
        date.setDate(date.getDate() + 14);
        break;
      case 'SEMIMONTHLY':
        if (date.getDate() < 15) {
          date.setDate(15);
        } else {
          date.setMonth(date.getMonth() + 1);
          date.setDate(1);
        }
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        if (paymentDay) {
          date.setDate(Math.min(paymentDay, this.getDaysInMonth(date)));
        }
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'ANNUAL':
        date.setFullYear(date.getFullYear() + 1);
        break;
      case 'ONE_TIME':
        date.setFullYear(9999); // Far future to exit loop
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }

    return date;
  }

  /**
   * Get days in a month
   */
  getDaysInMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  // ============================================
  // RECURRING REVENUE STREAMS
  // ============================================

  /**
   * Create recurring revenue stream
   */
  async createRecurringRevenueStream(data, userId = null) {
    try {
      const [stream] = await db.insert(recurring_revenue_streams)
        .values({
          stream_name: data.streamName,
          stream_type: data.streamType,
          payer_id: data.payerId || null,
          customer_segment: data.customerSegment,
          expected_monthly_revenue: data.expectedMonthlyRevenue,
          minimum_revenue: data.minimumRevenue,
          maximum_revenue: data.maximumRevenue,
          payment_cycle: data.paymentCycle,
          expected_collection_day: data.expectedCollectionDay,
          average_days_to_collection: data.averageDaysToCollection,
          base_collection_rate: data.baseCollectionRate || 10000,
          historical_collection_rate: data.historicalCollectionRate,
          effective_start_date: data.effectiveStartDate,
          effective_end_date: data.effectiveEndDate,
          seasonal_adjustment_factors: data.seasonalAdjustmentFactors,
          is_seasonal: data.isSeasonal || false,
          notes: data.notes,
          metadata: data.metadata,
          created_by_id: userId
        })
        .returning();

      await this.logAudit('RECURRING_REVENUE', stream.id, 'CREATE', null, null, null, userId);
      return stream;
    } catch (error) {
      logger.error('Error creating recurring revenue stream:', error);
      throw error;
    }
  }

  /**
   * Get active recurring revenue streams
   */
  async getActiveRevenueStreams(filters = {}) {
    try {
      let conditions = [
        eq(recurring_revenue_streams.is_active, true),
        eq(recurring_revenue_streams.status, 'ACTIVE')
      ];

      if (filters.streamType) {
        conditions.push(eq(recurring_revenue_streams.stream_type, filters.streamType));
      }
      if (filters.customerSegment) {
        conditions.push(eq(recurring_revenue_streams.customer_segment, filters.customerSegment));
      }

      return await db.select()
        .from(recurring_revenue_streams)
        .where(and(...conditions))
        .orderBy(recurring_revenue_streams.stream_name);
    } catch (error) {
      logger.error('Error getting revenue streams:', error);
      throw error;
    }
  }

  // ============================================
  // CASH FLOW SCENARIOS
  // ============================================

  /**
   * Create cash flow scenario
   */
  async createScenario(data, userId = null) {
    try {
      const [scenario] = await db.insert(cash_flow_scenarios)
        .values({
          scenario_name: data.scenarioName,
          scenario_type: data.scenarioType,
          description: data.description,
          collection_rate_adjustment: data.collectionRateAdjustment || 0,
          days_to_collection_adjustment: data.daysToCollectionAdjustment || 0,
          write_off_rate_adjustment: data.writeOffRateAdjustment || 0,
          revenue_growth_rate: data.revenueGrowthRate || 0,
          seasonal_variance_factor: data.seasonalVarianceFactor || '1.0',
          expense_inflation_rate: data.expenseInflationRate || 0,
          payroll_growth_rate: data.payrollGrowthRate || 0,
          vendor_cost_adjustment: data.vendorCostAdjustment || 0,
          early_payment_utilization: data.earlyPaymentUtilization,
          late_payment_probability: data.latePaymentProbability,
          collection_risk_factor: data.collectionRiskFactor || '1.0',
          expense_risk_factor: data.expenseRiskFactor || '1.0',
          currency_code: data.currencyCode || 'USD',
          is_default: data.isDefault || false,
          notes: data.notes,
          metadata: data.metadata,
          created_by_id: userId
        })
        .returning();

      await this.logAudit('SCENARIO', scenario.id, 'CREATE', null, null, null, userId);
      return scenario;
    } catch (error) {
      logger.error('Error creating scenario:', error);
      throw error;
    }
  }

  /**
   * Get default scenarios (base, optimistic, pessimistic)
   */
  async getDefaultScenarios() {
    try {
      // Check if default scenarios exist
      const existing = await db.select()
        .from(cash_flow_scenarios)
        .where(eq(cash_flow_scenarios.is_active, true));

      if (existing.length === 0) {
        // Create default scenarios
        return await this.createDefaultScenarios();
      }

      return existing;
    } catch (error) {
      logger.error('Error getting default scenarios:', error);
      throw error;
    }
  }

  /**
   * Create default scenarios
   */
  async createDefaultScenarios() {
    const scenarios = [
      {
        scenarioName: 'Base Case',
        scenarioType: 'BASE',
        description: 'Expected scenario with historical averages',
        collectionRateAdjustment: 0,
        daysToCollectionAdjustment: 0,
        isDefault: true
      },
      {
        scenarioName: 'Optimistic',
        scenarioType: 'OPTIMISTIC',
        description: 'Best case with improved collections and reduced expenses',
        collectionRateAdjustment: 1000, // +10%
        daysToCollectionAdjustment: -7, // 7 days faster
        revenueGrowthRate: 500, // 5% growth
        expenseInflationRate: -200 // 2% reduction
      },
      {
        scenarioName: 'Pessimistic',
        scenarioType: 'PESSIMISTIC',
        description: 'Conservative scenario with slower collections and higher expenses',
        collectionRateAdjustment: -1500, // -15%
        daysToCollectionAdjustment: 14, // 14 days slower
        writeOffRateAdjustment: 500, // +5% write-offs
        expenseInflationRate: 300 // 3% inflation
      }
    ];

    const created = [];
    for (const scenario of scenarios) {
      const result = await this.createScenario(scenario);
      created.push(result);
    }

    return created;
  }

  // ============================================
  // HISTORICAL COLLECTION PATTERN ANALYSIS
  // ============================================

  /**
   * Calculate and store historical collection patterns
   */
  async calculateHistoricalPatterns(analysisMonths = 12, dimension = 'OVERALL') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - analysisMonths);

      // Get collection data grouped by month
      const collectionData = await this.getCollectionDataByMonth(startDate, endDate, dimension);

      const patterns = [];
      for (const monthData of collectionData) {
        const pattern = await this.calculatePatternForPeriod(monthData, dimension);
        if (pattern) {
          patterns.push(pattern);
        }
      }

      // Calculate seasonal factors
      const seasonalFactors = this.calculateSeasonalFactors(patterns);

      // Update patterns with seasonal indicators
      for (const pattern of patterns) {
        const month = parseInt(pattern.pattern_period.split('-')[1]);
        const avgCollection = patterns.reduce((sum, p) => sum + Number(p.collection_rate || 0), 0) / patterns.length;

        pattern.seasonal_factor = seasonalFactors[month] || 1.0;
        pattern.is_peak_month = Number(pattern.collection_rate) > avgCollection * 1.1;
        pattern.is_slow_month = Number(pattern.collection_rate) < avgCollection * 0.9;

        // Store pattern
        await db.insert(historical_collection_patterns)
          .values(pattern)
          .onConflictDoNothing();
      }

      return patterns;
    } catch (error) {
      logger.error('Error calculating historical patterns:', error);
      throw error;
    }
  }

  /**
   * Get collection data by month for analysis
   */
  async getCollectionDataByMonth(startDate, endDate, dimension) {
    try {
      // Get monthly aggregated data from revenue accruals
      const data = await db.select({
        month: sql`TO_CHAR(${revenue_accruals.accrual_date}, 'YYYY-MM')`,
        totalInvoiced: sql`SUM(${revenue_accruals.accrued_amount})`,
        totalCollected: sql`SUM(${revenue_accruals.collected_amount})`,
        totalWrittenOff: sql`SUM(${revenue_accruals.written_off_amount})`,
        count: sql`COUNT(*)`,
        payerId: revenue_accruals.payer_id
      })
        .from(revenue_accruals)
        .where(
          and(
            gte(revenue_accruals.accrual_date, startDate.toISOString().split('T')[0]),
            lte(revenue_accruals.accrual_date, endDate.toISOString().split('T')[0])
          )
        )
        .groupBy(
          sql`TO_CHAR(${revenue_accruals.accrual_date}, 'YYYY-MM')`,
          revenue_accruals.payer_id
        )
        .orderBy(sql`TO_CHAR(${revenue_accruals.accrual_date}, 'YYYY-MM')`);

      return data;
    } catch (error) {
      logger.error('Error getting collection data by month:', error);
      throw error;
    }
  }

  /**
   * Calculate pattern metrics for a period
   */
  async calculatePatternForPeriod(monthData, dimension) {
    try {
      const totalInvoiced = Number(monthData.totalInvoiced) || 0;
      const totalCollected = Number(monthData.totalCollected) || 0;
      const totalWrittenOff = Number(monthData.totalWrittenOff) || 0;

      if (totalInvoiced === 0) return null;

      const collectionRate = Math.round((totalCollected / totalInvoiced) * 10000);
      const writeOffRate = Math.round((totalWrittenOff / totalInvoiced) * 10000);

      return {
        pattern_period: monthData.month,
        pattern_type: dimension,
        payer_id: monthData.payerId || null,
        total_invoiced_amount: totalInvoiced,
        total_collected_amount: totalCollected,
        total_written_off_amount: totalWrittenOff,
        total_invoiced_count: Number(monthData.count) || 0,
        collection_rate: collectionRate,
        write_off_rate: writeOffRate,
        sample_size: Number(monthData.count) || 0,
        data_completeness: 10000, // 100%
        calculation_date: new Date()
      };
    } catch (error) {
      logger.error('Error calculating pattern for period:', error);
      throw error;
    }
  }

  /**
   * Calculate seasonal factors from historical data
   */
  calculateSeasonalFactors(patterns) {
    const monthlyTotals = {};
    const monthCounts = {};

    for (const pattern of patterns) {
      const month = parseInt(pattern.pattern_period.split('-')[1]);
      const rate = Number(pattern.collection_rate) || 0;

      monthlyTotals[month] = (monthlyTotals[month] || 0) + rate;
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }

    const monthlyAverages = {};
    for (let month = 1; month <= 12; month++) {
      if (monthCounts[month]) {
        monthlyAverages[month] = monthlyTotals[month] / monthCounts[month];
      }
    }

    const overallAverage = Object.values(monthlyAverages).reduce((sum, v) => sum + v, 0) / Object.keys(monthlyAverages).length;

    const seasonalFactors = {};
    for (let month = 1; month <= 12; month++) {
      seasonalFactors[month] = overallAverage > 0
        ? (monthlyAverages[month] || overallAverage) / overallAverage
        : 1.0;
    }

    return seasonalFactors;
  }

  // ============================================
  // CORE CASH FLOW PROJECTION ENGINE
  // ============================================

  /**
   * Generate comprehensive cash flow projection
   */
  async generateProjection(options = {}, userId = null) {
    try {
      const {
        horizonDays = 90,
        periodType = 'MONTHLY',
        scenarioId = null,
        openingCashBalance = 0,
        includeScheduledPayments = true,
        includeRecurringRevenue = true,
        adjustForSeasonality = true
      } = options;

      // Get scenario (or use base case)
      let scenario = null;
      if (scenarioId) {
        const scenarios = await db.select()
          .from(cash_flow_scenarios)
          .where(eq(cash_flow_scenarios.id, scenarioId))
          .limit(1);
        scenario = scenarios[0];
      } else {
        const defaultScenarios = await this.getDefaultScenarios();
        scenario = defaultScenarios.find(s => s.scenario_type === 'BASE');
      }

      // Calculate projection dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + horizonDays);

      // Project cash inflows
      const inflows = await this.projectCashInflows(startDate, endDate, scenario, {
        includeRecurringRevenue,
        adjustForSeasonality
      });

      // Project cash outflows
      const outflows = await this.projectCashOutflows(startDate, endDate, scenario, {
        includeScheduledPayments
      });

      // Calculate period-by-period projections
      const periodProjections = this.generatePeriodProjections(
        startDate,
        endDate,
        periodType,
        inflows,
        outflows,
        openingCashBalance,
        scenario
      );

      // Calculate key metrics
      const metrics = this.calculateKeyMetrics(periodProjections, openingCashBalance);

      // Store forecast periods
      const storedForecasts = [];
      for (const period of periodProjections) {
        const [forecast] = await db.insert(cash_flow_forecast_periods)
          .values({
            forecast_date: new Date(),
            forecast_period_start: period.periodStart,
            forecast_period_end: period.periodEnd,
            period_label: period.periodLabel,
            period_type: periodType,
            horizon_days: horizonDays,
            forecast_horizon: this.getHorizonLabel(horizonDays),
            scenario_id: scenario?.id || null,
            scenario_type: scenario?.scenario_type || 'BASE',
            opening_cash_balance: period.openingBalance,
            projected_collections: period.collections,
            projected_appeal_recoveries: period.appealRecoveries,
            projected_recurring_revenue: period.recurringRevenue,
            projected_other_income: period.otherIncome,
            total_projected_inflows: period.totalInflows,
            projected_payroll: period.payroll,
            projected_rent: period.rent,
            projected_vendor_payments: period.vendorPayments,
            projected_utilities: period.utilities,
            projected_capital_expenditure: period.capitalExpenditure,
            projected_loan_payments: period.loanPayments,
            projected_taxes: period.taxes,
            projected_other_expenses: period.otherExpenses,
            total_projected_outflows: period.totalOutflows,
            projected_net_cash_flow: period.netCashFlow,
            projected_ending_cash: period.endingBalance,
            minimum_cash_balance: period.minimumBalance,
            minimum_cash_date: period.minimumBalanceDate,
            days_cash_on_hand: period.daysCashOnHand,
            confidence_level: this.calculateConfidenceLevel(period, scenario),
            confidence_percentage: this.calculateConfidencePercentage(period, scenario),
            methodology: 'COMPREHENSIVE_PROJECTION_ENGINE',
            assumptions: {
              scenario: scenario?.scenario_name,
              collectionRateAdjustment: scenario?.collection_rate_adjustment || 0,
              expenseInflationRate: scenario?.expense_inflation_rate || 0,
              includeScheduledPayments,
              includeRecurringRevenue,
              adjustForSeasonality
            },
            collection_rate_assumption: 8500 + (scenario?.collection_rate_adjustment || 0),
            created_by_id: userId
          })
          .returning();

        storedForecasts.push(forecast);
      }

      return {
        projectionId: storedForecasts[0]?.id,
        horizonDays,
        periodType,
        scenario: scenario?.scenario_name || 'Base Case',
        scenarioType: scenario?.scenario_type || 'BASE',
        summary: {
          totalProjectedInflows: inflows.total,
          totalProjectedOutflows: outflows.total,
          netCashFlow: inflows.total - outflows.total,
          openingCashBalance,
          projectedEndingCash: openingCashBalance + (inflows.total - outflows.total)
        },
        metrics,
        periods: periodProjections,
        forecasts: storedForecasts
      };
    } catch (error) {
      logger.error('Error generating projection:', error);
      throw error;
    }
  }

  /**
   * Project cash inflows
   */
  async projectCashInflows(startDate, endDate, scenario, options = {}) {
    try {
      const { includeRecurringRevenue, adjustForSeasonality } = options;

      // Get AR-based collections
      const arCollections = await this.projectCollectionsFromAR(startDate, endDate, scenario);

      // Get recurring revenue
      let recurringRevenue = 0;
      if (includeRecurringRevenue) {
        recurringRevenue = await this.projectRecurringRevenue(startDate, endDate, scenario);
      }

      // Get appeal recoveries (estimate 5% of collections)
      const appealRecoveries = Math.round(arCollections * 0.05);

      // Apply seasonal adjustment
      let seasonalFactor = 1.0;
      if (adjustForSeasonality) {
        seasonalFactor = await this.getSeasonalFactor(startDate);
      }

      const adjustedCollections = Math.round(arCollections * seasonalFactor);
      const adjustedRecurring = Math.round(recurringRevenue * seasonalFactor);

      return {
        collections: adjustedCollections,
        recurringRevenue: adjustedRecurring,
        appealRecoveries,
        otherIncome: 0,
        total: adjustedCollections + adjustedRecurring + appealRecoveries,
        breakdown: {
          arCollections,
          seasonalFactor,
          scenarioAdjustment: scenario?.collection_rate_adjustment || 0
        }
      };
    } catch (error) {
      logger.error('Error projecting cash inflows:', error);
      throw error;
    }
  }

  /**
   * Project collections from AR aging
   */
  async projectCollectionsFromAR(startDate, endDate, scenario) {
    try {
      // Get current AR by aging bucket
      const arAging = await this.getCurrentARByAging();

      // Calculate expected collections based on aging probability
      let totalProjected = 0;

      // Apply collection probability by bucket
      totalProjected += Math.round((arAging.current || 0) * (CashFlowProjectionEngineService.COLLECTION_PROBABILITY_BY_AGING.CURRENT / 10000));
      totalProjected += Math.round((arAging.days31_60 || 0) * (CashFlowProjectionEngineService.COLLECTION_PROBABILITY_BY_AGING.DAYS_31_60 / 10000));
      totalProjected += Math.round((arAging.days61_90 || 0) * (CashFlowProjectionEngineService.COLLECTION_PROBABILITY_BY_AGING.DAYS_61_90 / 10000));
      totalProjected += Math.round((arAging.days91_120 || 0) * (CashFlowProjectionEngineService.COLLECTION_PROBABILITY_BY_AGING.DAYS_91_120 / 10000));
      totalProjected += Math.round((arAging.over120 || 0) * (CashFlowProjectionEngineService.COLLECTION_PROBABILITY_BY_AGING.OVER_120 / 10000));

      // Apply scenario adjustment
      if (scenario?.collection_rate_adjustment) {
        const adjustment = 1 + (scenario.collection_rate_adjustment / 10000);
        totalProjected = Math.round(totalProjected * adjustment);
      }

      // Prorate based on projection period
      const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const monthlyProration = daysInPeriod / 30;

      return Math.round(totalProjected * Math.min(monthlyProration, 1));
    } catch (error) {
      logger.error('Error projecting collections from AR:', error);
      throw error;
    }
  }

  /**
   * Get current AR by aging bucket
   */
  async getCurrentARByAging() {
    try {
      const today = new Date();
      const days30Ago = new Date(today);
      days30Ago.setDate(days30Ago.getDate() - 30);
      const days60Ago = new Date(today);
      days60Ago.setDate(days60Ago.getDate() - 60);
      const days90Ago = new Date(today);
      days90Ago.setDate(days90Ago.getDate() - 90);
      const days120Ago = new Date(today);
      days120Ago.setDate(days120Ago.getDate() - 120);

      // Get outstanding AR grouped by aging
      const arData = await db.select({
        total: sql`SUM(${revenue_accruals.accrued_amount} - ${revenue_accruals.collected_amount} - ${revenue_accruals.written_off_amount})::bigint`,
        accrualDate: revenue_accruals.accrual_date
      })
        .from(revenue_accruals)
        .where(
          sql`${revenue_accruals.accrued_amount} > ${revenue_accruals.collected_amount} + ${revenue_accruals.written_off_amount}`
        )
        .groupBy(revenue_accruals.accrual_date);

      // Categorize by aging bucket
      const aging = {
        current: 0,
        days31_60: 0,
        days61_90: 0,
        days91_120: 0,
        over120: 0,
        total: 0
      };

      for (const record of arData) {
        const amount = Number(record.total) || 0;
        const accrualDate = new Date(record.accrualDate);

        if (accrualDate >= days30Ago) {
          aging.current += amount;
        } else if (accrualDate >= days60Ago) {
          aging.days31_60 += amount;
        } else if (accrualDate >= days90Ago) {
          aging.days61_90 += amount;
        } else if (accrualDate >= days120Ago) {
          aging.days91_120 += amount;
        } else {
          aging.over120 += amount;
        }
        aging.total += amount;
      }

      return aging;
    } catch (error) {
      logger.error('Error getting current AR by aging:', error);
      // Return default values if no data
      return {
        current: 0,
        days31_60: 0,
        days61_90: 0,
        days91_120: 0,
        over120: 0,
        total: 0
      };
    }
  }

  /**
   * Project recurring revenue
   */
  async projectRecurringRevenue(startDate, endDate, scenario) {
    try {
      const streams = await this.getActiveRevenueStreams();

      let totalRevenue = 0;
      const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const monthlyProration = daysInPeriod / 30;

      for (const stream of streams) {
        let streamRevenue = Number(stream.expected_monthly_revenue) || 0;

        // Apply collection rate
        const collectionRate = Number(stream.historical_collection_rate || stream.base_collection_rate || 10000) / 10000;
        streamRevenue = Math.round(streamRevenue * collectionRate);

        // Apply seasonal adjustment if applicable
        if (stream.is_seasonal && stream.seasonal_adjustment_factors) {
          const month = startDate.getMonth() + 1;
          const factors = stream.seasonal_adjustment_factors;
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const factor = factors[monthNames[month - 1]] || 1.0;
          streamRevenue = Math.round(streamRevenue * factor);
        }

        totalRevenue += streamRevenue;
      }

      // Prorate for period
      totalRevenue = Math.round(totalRevenue * monthlyProration);

      // Apply scenario adjustment
      if (scenario?.revenue_growth_rate) {
        const growth = 1 + (scenario.revenue_growth_rate / 10000);
        totalRevenue = Math.round(totalRevenue * growth);
      }

      return totalRevenue;
    } catch (error) {
      logger.error('Error projecting recurring revenue:', error);
      return 0;
    }
  }

  /**
   * Get seasonal factor for a date
   */
  async getSeasonalFactor(date) {
    try {
      const month = date.getMonth() + 1;
      const periodKey = `${date.getFullYear()}-${String(month).padStart(2, '0')}`;

      // Look for historical pattern
      const patterns = await db.select()
        .from(historical_collection_patterns)
        .where(eq(historical_collection_patterns.pattern_period, periodKey))
        .limit(1);

      if (patterns.length > 0 && patterns[0].seasonal_factor) {
        return parseFloat(patterns[0].seasonal_factor);
      }

      return 1.0;
    } catch (error) {
      logger.error('Error getting seasonal factor:', error);
      return 1.0;
    }
  }

  /**
   * Project cash outflows
   */
  async projectCashOutflows(startDate, endDate, scenario, options = {}) {
    try {
      const { includeScheduledPayments } = options;

      let outflows = {
        payroll: 0,
        rent: 0,
        vendorPayments: 0,
        utilities: 0,
        capitalExpenditure: 0,
        loanPayments: 0,
        taxes: 0,
        otherExpenses: 0,
        total: 0
      };

      if (includeScheduledPayments) {
        // Get scheduled payments in range
        const payments = await this.getPaymentsDueInRange(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Categorize payments
        for (const payment of payments) {
          const amount = payment.amount;

          switch (payment.scheduleType) {
            case 'PAYROLL':
              outflows.payroll += amount;
              break;
            case 'RENT':
              outflows.rent += amount;
              break;
            case 'VENDOR':
              outflows.vendorPayments += amount;
              break;
            case 'UTILITY':
              outflows.utilities += amount;
              break;
            case 'CAPITAL_EXPENSE':
              outflows.capitalExpenditure += amount;
              break;
            case 'LOAN_PAYMENT':
              outflows.loanPayments += amount;
              break;
            case 'TAX':
              outflows.taxes += amount;
              break;
            default:
              outflows.otherExpenses += amount;
          }
        }
      } else {
        // Use estimated defaults based on typical hospice operations
        const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const monthlyProration = daysInPeriod / 30;

        // Default monthly estimates (in cents)
        outflows.payroll = Math.round(500000000 * monthlyProration); // $5M
        outflows.rent = Math.round(50000000 * monthlyProration); // $500K
        outflows.vendorPayments = Math.round(200000000 * monthlyProration); // $2M
        outflows.utilities = Math.round(30000000 * monthlyProration); // $300K
        outflows.otherExpenses = Math.round(100000000 * monthlyProration); // $1M
      }

      // Apply scenario adjustments
      if (scenario) {
        if (scenario.expense_inflation_rate) {
          const inflation = 1 + (scenario.expense_inflation_rate / 10000);
          outflows.vendorPayments = Math.round(outflows.vendorPayments * inflation);
          outflows.utilities = Math.round(outflows.utilities * inflation);
          outflows.otherExpenses = Math.round(outflows.otherExpenses * inflation);
        }
        if (scenario.payroll_growth_rate) {
          const growth = 1 + (scenario.payroll_growth_rate / 10000);
          outflows.payroll = Math.round(outflows.payroll * growth);
        }
        if (scenario.vendor_cost_adjustment) {
          const adjustment = 1 + (scenario.vendor_cost_adjustment / 10000);
          outflows.vendorPayments = Math.round(outflows.vendorPayments * adjustment);
        }
      }

      // Calculate total
      outflows.total = outflows.payroll + outflows.rent + outflows.vendorPayments +
        outflows.utilities + outflows.capitalExpenditure + outflows.loanPayments +
        outflows.taxes + outflows.otherExpenses;

      return outflows;
    } catch (error) {
      logger.error('Error projecting cash outflows:', error);
      throw error;
    }
  }

  /**
   * Generate period-by-period projections
   */
  generatePeriodProjections(startDate, endDate, periodType, inflows, outflows, openingBalance, scenario) {
    const periods = [];
    let currentDate = new Date(startDate);
    let runningBalance = openingBalance;

    while (currentDate < endDate) {
      const periodStart = new Date(currentDate);
      const periodEnd = this.getPeriodEnd(currentDate, periodType, endDate);
      const periodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      // Prorate inflows and outflows for period
      const proration = periodDays / totalDays;

      const periodInflows = {
        collections: Math.round(inflows.collections * proration),
        recurringRevenue: Math.round(inflows.recurringRevenue * proration),
        appealRecoveries: Math.round(inflows.appealRecoveries * proration),
        otherIncome: Math.round((inflows.otherIncome || 0) * proration)
      };
      periodInflows.total = periodInflows.collections + periodInflows.recurringRevenue +
        periodInflows.appealRecoveries + periodInflows.otherIncome;

      const periodOutflows = {
        payroll: Math.round(outflows.payroll * proration),
        rent: Math.round(outflows.rent * proration),
        vendorPayments: Math.round(outflows.vendorPayments * proration),
        utilities: Math.round(outflows.utilities * proration),
        capitalExpenditure: Math.round(outflows.capitalExpenditure * proration),
        loanPayments: Math.round(outflows.loanPayments * proration),
        taxes: Math.round(outflows.taxes * proration),
        otherExpenses: Math.round(outflows.otherExpenses * proration)
      };
      periodOutflows.total = periodOutflows.payroll + periodOutflows.rent +
        periodOutflows.vendorPayments + periodOutflows.utilities +
        periodOutflows.capitalExpenditure + periodOutflows.loanPayments +
        periodOutflows.taxes + periodOutflows.otherExpenses;

      const netCashFlow = periodInflows.total - periodOutflows.total;
      const endingBalance = runningBalance + netCashFlow;

      // Calculate days cash on hand
      const dailyOutflow = periodOutflows.total / periodDays;
      const daysCashOnHand = dailyOutflow > 0 ? endingBalance / dailyOutflow : 999;

      periods.push({
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        periodLabel: this.getPeriodLabel(periodStart, periodType),
        periodDays,
        openingBalance: runningBalance,
        collections: periodInflows.collections,
        recurringRevenue: periodInflows.recurringRevenue,
        appealRecoveries: periodInflows.appealRecoveries,
        otherIncome: periodInflows.otherIncome,
        totalInflows: periodInflows.total,
        payroll: periodOutflows.payroll,
        rent: periodOutflows.rent,
        vendorPayments: periodOutflows.vendorPayments,
        utilities: periodOutflows.utilities,
        capitalExpenditure: periodOutflows.capitalExpenditure,
        loanPayments: periodOutflows.loanPayments,
        taxes: periodOutflows.taxes,
        otherExpenses: periodOutflows.otherExpenses,
        totalOutflows: periodOutflows.total,
        netCashFlow,
        endingBalance,
        minimumBalance: Math.min(runningBalance, endingBalance),
        minimumBalanceDate: runningBalance < endingBalance ? periodStart.toISOString().split('T')[0] : periodEnd.toISOString().split('T')[0],
        daysCashOnHand: Math.round(daysCashOnHand * 100) / 100
      });

      runningBalance = endingBalance;
      currentDate = new Date(periodEnd);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return periods;
  }

  /**
   * Get period end date based on period type
   */
  getPeriodEnd(startDate, periodType, maxEndDate) {
    const end = new Date(startDate);

    switch (periodType) {
      case 'WEEKLY':
        end.setDate(end.getDate() + 6);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of current month
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        break;
      case 'ANNUAL':
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        break;
      default:
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
    }

    return end > maxEndDate ? maxEndDate : end;
  }

  /**
   * Get period label
   */
  getPeriodLabel(date, periodType) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    switch (periodType) {
      case 'WEEKLY':
        const weekNum = Math.ceil((date.getDate() + new Date(year, month - 1, 1).getDay()) / 7);
        return `Week ${weekNum} ${year}-${String(month).padStart(2, '0')}`;
      case 'MONTHLY':
        return `${year}-${String(month).padStart(2, '0')}`;
      case 'QUARTERLY':
        const quarter = Math.ceil(month / 3);
        return `Q${quarter}-${year}`;
      case 'ANNUAL':
        return `${year}`;
      default:
        return `${year}-${String(month).padStart(2, '0')}`;
    }
  }

  /**
   * Get horizon label
   */
  getHorizonLabel(days) {
    if (days <= 30) return '30_DAY';
    if (days <= 60) return '60_DAY';
    if (days <= 90) return '90_DAY';
    if (days <= 180) return 'QUARTERLY';
    return 'ANNUAL';
  }

  /**
   * Calculate key metrics
   */
  calculateKeyMetrics(periods, openingBalance) {
    if (periods.length === 0) {
      return {
        netCashPosition: 0,
        minimumCashBalance: 0,
        minimumCashDate: null,
        peakFundingRequirement: 0,
        averageDaysCashOnHand: 0,
        cashRunway: 0
      };
    }

    // Net cash position (ending balance of last period)
    const netCashPosition = periods[periods.length - 1].endingBalance;

    // Minimum cash balance across all periods
    let minimumCashBalance = Infinity;
    let minimumCashDate = null;
    for (const period of periods) {
      if (period.minimumBalance < minimumCashBalance) {
        minimumCashBalance = period.minimumBalance;
        minimumCashDate = period.minimumBalanceDate;
      }
    }

    // Peak funding requirement (negative cash position)
    const peakFundingRequirement = minimumCashBalance < 0 ? Math.abs(minimumCashBalance) : 0;

    // Average days cash on hand
    const avgDaysCash = periods.reduce((sum, p) => sum + p.daysCashOnHand, 0) / periods.length;

    // Cash runway (days until cash runs out at current burn rate)
    const totalOutflows = periods.reduce((sum, p) => sum + p.totalOutflows, 0);
    const totalDays = periods.reduce((sum, p) => sum + p.periodDays, 0);
    const avgDailyBurn = totalOutflows / totalDays;
    const cashRunway = avgDailyBurn > 0 ? Math.round(netCashPosition / avgDailyBurn) : 999;

    return {
      netCashPosition,
      minimumCashBalance: minimumCashBalance === Infinity ? 0 : minimumCashBalance,
      minimumCashDate,
      peakFundingRequirement,
      averageDaysCashOnHand: Math.round(avgDaysCash * 100) / 100,
      cashRunway
    };
  }

  /**
   * Calculate confidence level
   */
  calculateConfidenceLevel(period, scenario) {
    // Base confidence on scenario type and data quality
    if (scenario?.scenario_type === 'BASE') return 'MEDIUM';
    if (scenario?.scenario_type === 'OPTIMISTIC') return 'LOW';
    if (scenario?.scenario_type === 'PESSIMISTIC') return 'MEDIUM';
    return 'MEDIUM';
  }

  /**
   * Calculate confidence percentage
   */
  calculateConfidencePercentage(period, scenario) {
    let base = 7500; // 75% base

    // Adjust based on scenario
    if (scenario?.scenario_type === 'BASE') base = 8000;
    if (scenario?.scenario_type === 'OPTIMISTIC') base = 6500;
    if (scenario?.scenario_type === 'PESSIMISTIC') base = 7000;

    // Reduce confidence for longer periods
    if (period.periodDays > 90) base -= 500;
    if (period.periodDays > 180) base -= 500;

    return Math.max(5000, Math.min(9500, base));
  }

  // ============================================
  // ROLLING PROJECTIONS
  // ============================================

  /**
   * Generate rolling 13-week cash flow projection
   */
  async generateRolling13WeekProjection(openingBalance = 0, userId = null) {
    try {
      return await this.generateProjection({
        horizonDays: 91, // 13 weeks
        periodType: 'WEEKLY',
        openingCashBalance: openingBalance,
        includeScheduledPayments: true,
        includeRecurringRevenue: true,
        adjustForSeasonality: true
      }, userId);
    } catch (error) {
      logger.error('Error generating 13-week projection:', error);
      throw error;
    }
  }

  /**
   * Generate rolling quarterly projection
   */
  async generateQuarterlyProjection(openingBalance = 0, userId = null) {
    try {
      return await this.generateProjection({
        horizonDays: 365,
        periodType: 'QUARTERLY',
        openingCashBalance: openingBalance,
        includeScheduledPayments: true,
        includeRecurringRevenue: true,
        adjustForSeasonality: true
      }, userId);
    } catch (error) {
      logger.error('Error generating quarterly projection:', error);
      throw error;
    }
  }

  // ============================================
  // SCENARIO COMPARISON
  // ============================================

  /**
   * Generate multi-scenario comparison
   */
  async generateScenarioComparison(options = {}, userId = null) {
    try {
      const scenarios = await this.getDefaultScenarios();
      const results = {};

      for (const scenario of scenarios) {
        results[scenario.scenario_type] = await this.generateProjection({
          ...options,
          scenarioId: scenario.id
        }, userId);
      }

      // Calculate comparison metrics
      const comparison = {
        base: results.BASE?.metrics,
        optimistic: results.OPTIMISTIC?.metrics,
        pessimistic: results.PESSIMISTIC?.metrics,
        variance: {
          netCashPositionRange: {
            min: results.PESSIMISTIC?.metrics?.netCashPosition || 0,
            max: results.OPTIMISTIC?.metrics?.netCashPosition || 0,
            base: results.BASE?.metrics?.netCashPosition || 0
          },
          peakFundingRange: {
            min: results.OPTIMISTIC?.metrics?.peakFundingRequirement || 0,
            max: results.PESSIMISTIC?.metrics?.peakFundingRequirement || 0,
            base: results.BASE?.metrics?.peakFundingRequirement || 0
          }
        }
      };

      return {
        scenarios: results,
        comparison
      };
    } catch (error) {
      logger.error('Error generating scenario comparison:', error);
      throw error;
    }
  }

  // ============================================
  // UPDATE WITH ACTUALS
  // ============================================

  /**
   * Update forecast with actual results
   */
  async updateForecastActuals(forecastId, actuals, userId = null) {
    try {
      const [forecast] = await db.select()
        .from(cash_flow_forecast_periods)
        .where(eq(cash_flow_forecast_periods.id, forecastId))
        .limit(1);

      if (!forecast) {
        throw new Error(`Forecast not found: ${forecastId}`);
      }

      // Calculate variances
      const varianceCollections = (actuals.actualCollections || 0) - (forecast.projected_collections || 0);
      const varianceCollectionsPct = forecast.projected_collections > 0
        ? Math.round((varianceCollections / forecast.projected_collections) * 10000)
        : 0;

      const varianceOutflows = (actuals.actualOutflows || 0) - (forecast.total_projected_outflows || 0);
      const varianceOutflowsPct = forecast.total_projected_outflows > 0
        ? Math.round((varianceOutflows / forecast.total_projected_outflows) * 10000)
        : 0;

      const actualNetCashFlow = (actuals.actualCollections || 0) - (actuals.actualOutflows || 0);
      const varianceNetCashFlow = actualNetCashFlow - (forecast.projected_net_cash_flow || 0);
      const varianceNetCashFlowPct = forecast.projected_net_cash_flow !== 0
        ? Math.round((varianceNetCashFlow / Math.abs(forecast.projected_net_cash_flow)) * 10000)
        : 0;

      await db.update(cash_flow_forecast_periods)
        .set({
          actual_collections: actuals.actualCollections,
          actual_outflows: actuals.actualOutflows,
          actual_net_cash_flow: actualNetCashFlow,
          actual_ending_cash: actuals.actualEndingCash,
          variance_collections: varianceCollections,
          variance_collections_pct: varianceCollectionsPct,
          variance_outflows: varianceOutflows,
          variance_outflows_pct: varianceOutflowsPct,
          variance_net_cash_flow: varianceNetCashFlow,
          variance_net_cash_flow_pct: varianceNetCashFlowPct,
          updated_at: new Date()
        })
        .where(eq(cash_flow_forecast_periods.id, forecastId));

      await this.logAudit('FORECAST', forecastId, 'UPDATE', 'actuals', null, JSON.stringify(actuals), userId);

      return {
        forecastId,
        variance: {
          collections: { amount: varianceCollections, percentage: varianceCollectionsPct / 100 },
          outflows: { amount: varianceOutflows, percentage: varianceOutflowsPct / 100 },
          netCashFlow: { amount: varianceNetCashFlow, percentage: varianceNetCashFlowPct / 100 }
        }
      };
    } catch (error) {
      logger.error('Error updating forecast actuals:', error);
      throw error;
    }
  }

  // ============================================
  // REPORTS AND EXPORTS
  // ============================================

  /**
   * Get cash flow summary report
   */
  async getCashFlowSummaryReport(startPeriod, endPeriod) {
    try {
      const forecasts = await db.select()
        .from(cash_flow_forecast_periods)
        .where(
          and(
            gte(cash_flow_forecast_periods.period_label, startPeriod),
            lte(cash_flow_forecast_periods.period_label, endPeriod)
          )
        )
        .orderBy(cash_flow_forecast_periods.period_label);

      const summary = {
        periodRange: { start: startPeriod, end: endPeriod },
        totalProjectedInflows: 0,
        totalProjectedOutflows: 0,
        totalProjectedNetCashFlow: 0,
        totalActualCollections: 0,
        totalActualOutflows: 0,
        totalActualNetCashFlow: 0,
        averageVariance: 0,
        forecastAccuracy: 0,
        forecastCount: forecasts.length,
        byPeriod: []
      };

      let completedForecasts = 0;
      let totalVariancePct = 0;

      for (const forecast of forecasts) {
        summary.totalProjectedInflows += Number(forecast.total_projected_inflows) || 0;
        summary.totalProjectedOutflows += Number(forecast.total_projected_outflows) || 0;
        summary.totalProjectedNetCashFlow += Number(forecast.projected_net_cash_flow) || 0;

        if (forecast.actual_collections !== null) {
          summary.totalActualCollections += Number(forecast.actual_collections) || 0;
          summary.totalActualOutflows += Number(forecast.actual_outflows) || 0;
          summary.totalActualNetCashFlow += Number(forecast.actual_net_cash_flow) || 0;
          completedForecasts++;
          totalVariancePct += Math.abs(Number(forecast.variance_net_cash_flow_pct) || 0);
        }

        summary.byPeriod.push({
          period: forecast.period_label,
          projectedInflows: Number(forecast.total_projected_inflows) || 0,
          projectedOutflows: Number(forecast.total_projected_outflows) || 0,
          projectedNetCashFlow: Number(forecast.projected_net_cash_flow) || 0,
          actualNetCashFlow: forecast.actual_net_cash_flow !== null ? Number(forecast.actual_net_cash_flow) : null,
          variancePercent: forecast.variance_net_cash_flow_pct !== null ? Number(forecast.variance_net_cash_flow_pct) / 100 : null
        });
      }

      if (completedForecasts > 0) {
        summary.averageVariance = totalVariancePct / completedForecasts / 100;
        summary.forecastAccuracy = 100 - summary.averageVariance;
      }

      return summary;
    } catch (error) {
      logger.error('Error getting cash flow summary report:', error);
      throw error;
    }
  }

  /**
   * Export projection to CSV format
   */
  async exportProjectionToCSV(projectionId) {
    try {
      const forecasts = await db.select()
        .from(cash_flow_forecast_periods)
        .where(eq(cash_flow_forecast_periods.id, projectionId));

      if (forecasts.length === 0) {
        throw new Error(`Projection not found: ${projectionId}`);
      }

      const headers = [
        'Period', 'Period Start', 'Period End',
        'Opening Balance', 'Projected Collections', 'Projected Recurring Revenue',
        'Appeal Recoveries', 'Other Income', 'Total Inflows',
        'Payroll', 'Rent', 'Vendor Payments', 'Utilities',
        'Capital Expenditure', 'Loan Payments', 'Taxes', 'Other Expenses', 'Total Outflows',
        'Net Cash Flow', 'Ending Balance', 'Days Cash on Hand',
        'Actual Collections', 'Actual Outflows', 'Actual Net Cash Flow',
        'Variance Amount', 'Variance %'
      ];

      const rows = forecasts.map(f => [
        f.period_label,
        f.forecast_period_start,
        f.forecast_period_end,
        this.centsToDollars(f.opening_cash_balance),
        this.centsToDollars(f.projected_collections),
        this.centsToDollars(f.projected_recurring_revenue),
        this.centsToDollars(f.projected_appeal_recoveries),
        this.centsToDollars(f.projected_other_income),
        this.centsToDollars(f.total_projected_inflows),
        this.centsToDollars(f.projected_payroll),
        this.centsToDollars(f.projected_rent),
        this.centsToDollars(f.projected_vendor_payments),
        this.centsToDollars(f.projected_utilities),
        this.centsToDollars(f.projected_capital_expenditure),
        this.centsToDollars(f.projected_loan_payments),
        this.centsToDollars(f.projected_taxes),
        this.centsToDollars(f.projected_other_expenses),
        this.centsToDollars(f.total_projected_outflows),
        this.centsToDollars(f.projected_net_cash_flow),
        this.centsToDollars(f.projected_ending_cash),
        f.days_cash_on_hand,
        f.actual_collections !== null ? this.centsToDollars(f.actual_collections) : '',
        f.actual_outflows !== null ? this.centsToDollars(f.actual_outflows) : '',
        f.actual_net_cash_flow !== null ? this.centsToDollars(f.actual_net_cash_flow) : '',
        f.variance_net_cash_flow !== null ? this.centsToDollars(f.variance_net_cash_flow) : '',
        f.variance_net_cash_flow_pct !== null ? (f.variance_net_cash_flow_pct / 100).toFixed(2) + '%' : ''
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      return csv;
    } catch (error) {
      logger.error('Error exporting projection to CSV:', error);
      throw error;
    }
  }

  /**
   * Convert cents to dollars
   */
  centsToDollars(cents) {
    if (cents === null || cents === undefined) return '';
    return (Number(cents) / 100).toFixed(2);
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * Log audit entry
   */
  async logAudit(entityType, entityId, actionType, fieldChanged, oldValue, newValue, userId, context = null) {
    try {
      await db.insert(cash_flow_audit_log)
        .values({
          entity_type: entityType,
          entity_id: entityId,
          action_type: actionType,
          field_changed: fieldChanged,
          old_value: oldValue,
          new_value: newValue,
          context,
          changed_by_id: userId
        });
    } catch (error) {
      logger.error('Error logging audit entry:', error);
      // Don't throw - audit logging shouldn't break main operations
    }
  }

  /**
   * Get audit log for entity
   */
  async getAuditLog(entityType, entityId) {
    try {
      return await db.select()
        .from(cash_flow_audit_log)
        .where(
          and(
            eq(cash_flow_audit_log.entity_type, entityType),
            eq(cash_flow_audit_log.entity_id, entityId)
          )
        )
        .orderBy(desc(cash_flow_audit_log.changed_at));
    } catch (error) {
      logger.error('Error getting audit log:', error);
      throw error;
    }
  }
}

export default new CashFlowProjectionEngineService();
