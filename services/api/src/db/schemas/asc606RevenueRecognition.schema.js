import { pgTable, bigint, varchar, text, date, timestamp, boolean, jsonb, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { contracts, payers, claims } from './billing.schema.js';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * ASC 606 Revenue Recognition Schema
 *
 * Implements the FASB ASC 606 five-step model for revenue recognition:
 * 1. Identify the contract with a customer
 * 2. Identify the performance obligations in the contract
 * 3. Determine the transaction price
 * 4. Allocate the transaction price to performance obligations
 * 5. Recognize revenue when (or as) the entity satisfies a performance obligation
 *
 * Tables:
 * 1. asc606_contracts - Contract identification and validation (Step 1)
 * 2. asc606_performance_obligations - Performance obligation tracking (Step 2)
 * 3. asc606_transaction_prices - Transaction price determination (Step 3)
 * 4. asc606_price_allocations - Price allocation to obligations (Step 4)
 * 5. asc606_daily_revenue_accruals - Daily revenue recognition (Step 5)
 * 6. asc606_contract_modifications - Contract amendments and changes
 * 7. asc606_variable_consideration - Variable consideration tracking
 * 8. asc606_revenue_schedules - Recognition schedule patterns
 * 9. asc606_audit_trail - Calculation audit trail
 */

// ============================================
// TABLE 1: ASC 606 CONTRACTS
// ============================================
// Step 1: Identify the contract with a customer
// Tracks contract identification, validation, and lifecycle
export const asc606_contracts = pgTable('asc606_contracts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Contract reference
  billing_contract_id: bigint('billing_contract_id', { mode: 'number' }).references(() => contracts.id),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Contract identification
  contract_number: varchar('contract_number', { length: 100 }).notNull(),
  contract_name: varchar('contract_name', { length: 255 }),
  contract_type: varchar('contract_type', { length: 50 }).notNull(), // SERVICE_AGREEMENT, CAPITATION, FEE_FOR_SERVICE, BUNDLED_PAYMENT

  // Contract period
  contract_start_date: date('contract_start_date').notNull(),
  contract_end_date: date('contract_end_date'),
  is_evergreen: boolean('is_evergreen').default(false), // Auto-renewing contract

  // Contract value
  total_contract_value: bigint('total_contract_value', { mode: 'number' }), // In cents
  estimated_contract_value: bigint('estimated_contract_value', { mode: 'number' }), // For variable contracts
  currency: varchar('currency', { length: 3 }).default('USD'),

  // ASC 606 Step 1 Criteria - Contract must meet ALL of these
  criteria_approval_commitment: boolean('criteria_approval_commitment').default(false), // Both parties have approved and committed
  criteria_rights_identified: boolean('criteria_rights_identified').default(false), // Rights to goods/services identified
  criteria_payment_terms_identified: boolean('criteria_payment_terms_identified').default(false), // Payment terms identified
  criteria_commercial_substance: boolean('criteria_commercial_substance').default(false), // Contract has commercial substance
  criteria_collection_probable: boolean('criteria_collection_probable').default(false), // Collection is probable

  // Contract validation
  is_valid_asc606_contract: boolean('is_valid_asc606_contract').default(false), // All 5 criteria met
  validation_date: timestamp('validation_date'),
  validation_notes: text('validation_notes'),

  // Contract status
  contract_status: varchar('contract_status', { length: 50 }).default('DRAFT').notNull(),
  // DRAFT, PENDING_VALIDATION, ACTIVE, MODIFIED, SUSPENDED, TERMINATED, COMPLETED

  // Collectibility assessment
  collectibility_probability: bigint('collectibility_probability', { mode: 'number' }).default(10000), // Basis points (0-10000 = 0-100%)
  collectibility_assessment_date: date('collectibility_assessment_date'),
  collectibility_notes: text('collectibility_notes'),

  // Significant financing component (for long-term contracts)
  has_financing_component: boolean('has_financing_component').default(false),
  financing_rate: bigint('financing_rate', { mode: 'number' }), // Basis points annual rate

  // Non-cash consideration
  has_non_cash_consideration: boolean('has_non_cash_consideration').default(false),
  non_cash_consideration_value: bigint('non_cash_consideration_value', { mode: 'number' }),
  non_cash_consideration_description: text('non_cash_consideration_description'),

  // Time zone for global contracts
  contract_timezone: varchar('contract_timezone', { length: 50 }).default('America/New_York'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at')
}, (table) => ({
  contractNumberIdx: index('idx_asc606_contracts_number').on(table.contract_number),
  payerIdx: index('idx_asc606_contracts_payer').on(table.payer_id),
  patientIdx: index('idx_asc606_contracts_patient').on(table.patient_id),
  statusIdx: index('idx_asc606_contracts_status').on(table.contract_status),
  dateRangeIdx: index('idx_asc606_contracts_date_range').on(table.contract_start_date, table.contract_end_date)
}));

// ============================================
// TABLE 2: PERFORMANCE OBLIGATIONS
// ============================================
// Step 2: Identify the performance obligations
// Tracks distinct goods/services promised to customer
export const asc606_performance_obligations = pgTable('asc606_performance_obligations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Contract reference
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),

  // Obligation identification
  obligation_number: varchar('obligation_number', { length: 50 }).notNull(),
  obligation_name: varchar('obligation_name', { length: 255 }).notNull(),
  obligation_description: text('obligation_description'),

  // Type of obligation
  obligation_type: varchar('obligation_type', { length: 50 }).notNull(),
  // HOSPICE_ROUTINE_CARE, HOSPICE_CONTINUOUS_CARE, HOSPICE_RESPITE_CARE, HOSPICE_INPATIENT_CARE
  // DME_EQUIPMENT, PHARMACY_SERVICES, SKILLED_NURSING, THERAPY_SERVICES
  // ADMINISTRATIVE_SERVICES, BUNDLED_SERVICES

  // Distinctiveness assessment
  is_distinct: boolean('is_distinct').default(true), // Can be sold separately?
  is_separately_identifiable: boolean('is_separately_identifiable').default(true), // Distinct within contract context?
  distinctiveness_notes: text('distinctiveness_notes'),

  // Performance obligation characteristics
  satisfaction_pattern: varchar('satisfaction_pattern', { length: 50 }).notNull(),
  // POINT_IN_TIME - Revenue recognized at a specific point
  // OVER_TIME_OUTPUT - Based on outputs delivered (units, milestones)
  // OVER_TIME_INPUT - Based on inputs used (cost, time)
  // STRAIGHT_LINE - Even recognition over period

  // Revenue recognition pattern
  recognition_pattern: varchar('recognition_pattern', { length: 50 }).notNull(),
  // STRAIGHT_LINE - Daily accrual divided evenly
  // USAGE_BASED - Based on actual usage/days of service
  // MILESTONE_BASED - Recognized at milestone completion
  // PERCENTAGE_OF_COMPLETION - Based on % complete

  // Standalone selling price (for allocation)
  standalone_selling_price: bigint('standalone_selling_price', { mode: 'number' }), // In cents
  ssp_method: varchar('ssp_method', { length: 50 }),
  // OBSERVABLE_PRICE - Based on market price
  // ADJUSTED_MARKET - Market price with adjustments
  // EXPECTED_COST_PLUS_MARGIN - Cost plus expected margin
  // RESIDUAL_APPROACH - Contract price minus other SSPs

  // Allocated transaction price
  allocated_price: bigint('allocated_price', { mode: 'number' }), // In cents
  allocation_percentage: bigint('allocation_percentage', { mode: 'number' }), // Basis points

  // Period for obligation
  obligation_start_date: date('obligation_start_date').notNull(),
  obligation_end_date: date('obligation_end_date'),
  expected_duration_days: bigint('expected_duration_days', { mode: 'number' }),

  // Satisfaction status
  satisfaction_status: varchar('satisfaction_status', { length: 50 }).default('NOT_STARTED').notNull(),
  // NOT_STARTED, IN_PROGRESS, SATISFIED, PARTIALLY_SATISFIED, CANCELLED

  satisfaction_percentage: bigint('satisfaction_percentage', { mode: 'number' }).default(0), // Basis points
  satisfaction_date: date('satisfaction_date'), // When fully satisfied

  // Revenue recognized
  total_recognized: bigint('total_recognized', { mode: 'number' }).default(0), // In cents
  total_deferred: bigint('total_deferred', { mode: 'number' }).default(0), // In cents

  // Measurement
  output_measure_unit: varchar('output_measure_unit', { length: 50 }), // DAYS, UNITS, MILESTONES, VISITS
  total_expected_outputs: bigint('total_expected_outputs', { mode: 'number' }),
  total_delivered_outputs: bigint('total_delivered_outputs', { mode: 'number' }).default(0),

  // Series guidance (ASC 606-10-25-14)
  is_series: boolean('is_series').default(false), // Distinct services substantially the same
  series_increment: varchar('series_increment', { length: 50 }), // DAILY, WEEKLY, MONTHLY

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_po_contract').on(table.contract_id),
  statusIdx: index('idx_asc606_po_status').on(table.satisfaction_status),
  typeIdx: index('idx_asc606_po_type').on(table.obligation_type),
  dateRangeIdx: index('idx_asc606_po_date_range').on(table.obligation_start_date, table.obligation_end_date),
  contractObligationIdx: uniqueIndex('idx_asc606_po_contract_number').on(table.contract_id, table.obligation_number)
}));

// ============================================
// TABLE 3: TRANSACTION PRICES
// ============================================
// Step 3: Determine the transaction price
// Tracks transaction price components including variable consideration
export const asc606_transaction_prices = pgTable('asc606_transaction_prices', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Contract reference
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),

  // Price version tracking
  version: bigint('version', { mode: 'number' }).default(1).notNull(),
  effective_date: date('effective_date').notNull(),
  superseded_date: date('superseded_date'),
  is_current: boolean('is_current').default(true),

  // Fixed consideration
  fixed_consideration: bigint('fixed_consideration', { mode: 'number' }).notNull(), // In cents

  // Variable consideration
  has_variable_consideration: boolean('has_variable_consideration').default(false),
  variable_consideration_estimate: bigint('variable_consideration_estimate', { mode: 'number' }), // In cents
  variable_consideration_method: varchar('variable_consideration_method', { length: 50 }),
  // EXPECTED_VALUE - Probability-weighted estimate
  // MOST_LIKELY_AMOUNT - Single most likely outcome

  // Constraint on variable consideration
  constraint_applied: boolean('constraint_applied').default(false),
  constrained_amount: bigint('constrained_amount', { mode: 'number' }), // Amount excluded due to constraint
  constraint_reason: text('constraint_reason'),

  // Total transaction price
  total_transaction_price: bigint('total_transaction_price', { mode: 'number' }).notNull(), // In cents

  // Significant financing component adjustment
  financing_adjustment: bigint('financing_adjustment', { mode: 'number' }), // In cents

  // Non-cash consideration at fair value
  non_cash_fair_value: bigint('non_cash_fair_value', { mode: 'number' }), // In cents

  // Consideration payable to customer (reduces transaction price)
  consideration_payable_to_customer: bigint('consideration_payable_to_customer', { mode: 'number' }),

  // Price calculation details
  calculation_method: text('calculation_method'),
  calculation_assumptions: jsonb('calculation_assumptions'),

  // Approval
  approved: boolean('approved').default(false),
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_tp_contract').on(table.contract_id),
  currentIdx: index('idx_asc606_tp_current').on(table.contract_id, table.is_current),
  effectiveIdx: index('idx_asc606_tp_effective').on(table.effective_date)
}));

// ============================================
// TABLE 4: VARIABLE CONSIDERATION
// ============================================
// Detailed tracking of variable consideration components
export const asc606_variable_consideration = pgTable('asc606_variable_consideration', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  transaction_price_id: bigint('transaction_price_id', { mode: 'number' }).references(() => asc606_transaction_prices.id).notNull(),
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),

  // Variable consideration type
  consideration_type: varchar('consideration_type', { length: 50 }).notNull(),
  // VOLUME_DISCOUNT, REBATE, REFUND, PERFORMANCE_BONUS, PENALTY, CONTINGENT_FEE
  // PRICE_CONCESSION, RIGHT_OF_RETURN, ROYALTY, USAGE_BASED

  consideration_name: varchar('consideration_name', { length: 255 }).notNull(),
  description: text('description'),

  // Estimation method
  estimation_method: varchar('estimation_method', { length: 50 }).notNull(),
  // EXPECTED_VALUE, MOST_LIKELY_AMOUNT

  // Expected value method details (probability-weighted)
  probability_scenarios: jsonb('probability_scenarios'),
  // Array of { amount: cents, probability: basis_points, description: string }

  // Most likely amount details
  most_likely_amount: bigint('most_likely_amount', { mode: 'number' }),
  alternative_outcomes: jsonb('alternative_outcomes'),

  // Estimated amount before constraint
  estimated_amount: bigint('estimated_amount', { mode: 'number' }).notNull(), // In cents

  // Constraint assessment (ASC 606-10-32-11)
  is_constrained: boolean('is_constrained').default(false),
  constraint_factors: jsonb('constraint_factors'),
  // Factors: EXPERIENCE_LIMITED, LONG_PERIOD_BEFORE_RESOLUTION, VOLATILE_MARKET,
  //          BROAD_PRICE_RANGE, HIGHLY_SUSCEPTIBLE_TO_EXTERNAL_FACTORS

  constrained_amount: bigint('constrained_amount', { mode: 'number' }), // Amount to include in transaction price
  constraint_release_date: date('constraint_release_date'), // When constraint may be released

  // Reversal assessment (will NOT result in significant revenue reversal)
  reversal_probability: bigint('reversal_probability', { mode: 'number' }), // Basis points
  reversal_impact_if_occurs: bigint('reversal_impact_if_occurs', { mode: 'number' }), // In cents

  // Re-estimation
  requires_reestimation: boolean('requires_reestimation').default(true),
  reestimation_frequency: varchar('reestimation_frequency', { length: 50 }), // DAILY, WEEKLY, MONTHLY, QUARTERLY
  last_reestimated_at: timestamp('last_reestimated_at'),
  next_reestimation_date: date('next_reestimation_date'),

  // Resolution
  is_resolved: boolean('is_resolved').default(false),
  resolved_date: date('resolved_date'),
  resolved_amount: bigint('resolved_amount', { mode: 'number' }),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  transactionPriceIdx: index('idx_asc606_vc_transaction_price').on(table.transaction_price_id),
  contractIdx: index('idx_asc606_vc_contract').on(table.contract_id),
  typeIdx: index('idx_asc606_vc_type').on(table.consideration_type),
  resolvedIdx: index('idx_asc606_vc_resolved').on(table.is_resolved)
}));

// ============================================
// TABLE 5: PRICE ALLOCATIONS
// ============================================
// Step 4: Allocate the transaction price to performance obligations
export const asc606_price_allocations = pgTable('asc606_price_allocations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),
  transaction_price_id: bigint('transaction_price_id', { mode: 'number' }).references(() => asc606_transaction_prices.id).notNull(),
  obligation_id: bigint('obligation_id', { mode: 'number' }).references(() => asc606_performance_obligations.id).notNull(),

  // Allocation version
  version: bigint('version', { mode: 'number' }).default(1).notNull(),
  effective_date: date('effective_date').notNull(),
  is_current: boolean('is_current').default(true),

  // Standalone selling price (SSP)
  standalone_selling_price: bigint('standalone_selling_price', { mode: 'number' }).notNull(), // In cents
  ssp_determination_method: varchar('ssp_determination_method', { length: 50 }).notNull(),
  // OBSERVABLE_STANDALONE, ADJUSTED_MARKET_ASSESSMENT, EXPECTED_COST_PLUS_MARGIN, RESIDUAL

  ssp_observable_source: text('ssp_observable_source'), // Source of observable price
  ssp_adjustments: jsonb('ssp_adjustments'), // Any adjustments made

  // Relative SSP calculation
  relative_ssp_percentage: bigint('relative_ssp_percentage', { mode: 'number' }).notNull(), // Basis points
  // = This obligation SSP / Sum of all SSPs

  // Allocated amount
  allocated_amount: bigint('allocated_amount', { mode: 'number' }).notNull(), // In cents
  // = Transaction price * relative_ssp_percentage

  // Discount allocation (if any)
  discount_amount: bigint('discount_amount', { mode: 'number' }), // In cents
  discount_allocation_method: varchar('discount_allocation_method', { length: 50 }),
  // PROPORTIONAL - Discount spread across all obligations
  // SPECIFIC - Discount allocated to specific obligations only

  // Variable consideration allocation
  variable_consideration_allocated: bigint('variable_consideration_allocated', { mode: 'number' }), // In cents
  variable_consideration_allocation_method: varchar('variable_consideration_allocation_method', { length: 50 }),
  // ENTIRELY_TO_ONE - All to one obligation
  // PROPORTIONAL - Spread proportionally
  // RESIDUAL - Residual to one after fixed to others

  // Daily accrual rate
  daily_accrual_rate: bigint('daily_accrual_rate', { mode: 'number' }), // In cents per day

  // Calculation details
  calculation_workpaper: jsonb('calculation_workpaper'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_pa_contract').on(table.contract_id),
  obligationIdx: index('idx_asc606_pa_obligation').on(table.obligation_id),
  currentIdx: index('idx_asc606_pa_current').on(table.contract_id, table.is_current),
  transactionPriceIdx: index('idx_asc606_pa_transaction_price').on(table.transaction_price_id)
}));

// ============================================
// TABLE 6: DAILY REVENUE ACCRUALS
// ============================================
// Step 5: Recognize revenue when (or as) the entity satisfies a performance obligation
// Daily tracking of revenue recognition
export const asc606_daily_revenue_accruals = pgTable('asc606_daily_revenue_accruals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),
  obligation_id: bigint('obligation_id', { mode: 'number' }).references(() => asc606_performance_obligations.id).notNull(),
  allocation_id: bigint('allocation_id', { mode: 'number' }).references(() => asc606_price_allocations.id),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Accrual date
  accrual_date: date('accrual_date').notNull(), // The specific day
  fiscal_year: bigint('fiscal_year', { mode: 'number' }).notNull(),
  fiscal_quarter: bigint('fiscal_quarter', { mode: 'number' }).notNull(), // 1-4
  fiscal_month: bigint('fiscal_month', { mode: 'number' }).notNull(), // 1-12
  period_label: varchar('period_label', { length: 7 }).notNull(), // YYYY-MM

  // Day-specific calculations
  is_leap_year: boolean('is_leap_year').default(false),
  days_in_month: bigint('days_in_month', { mode: 'number' }).notNull(),
  is_partial_period: boolean('is_partial_period').default(false), // First/last day of contract

  // Recognition pattern for this day
  recognition_pattern: varchar('recognition_pattern', { length: 50 }).notNull(),
  // STRAIGHT_LINE, USAGE_BASED, MILESTONE, PRO_RATA

  // Amounts (in cents)
  base_daily_rate: bigint('base_daily_rate', { mode: 'number' }).notNull(), // Standard daily rate
  adjustment_factor: bigint('adjustment_factor', { mode: 'number' }).default(10000), // Basis points (10000 = 100%)
  adjusted_daily_amount: bigint('adjusted_daily_amount', { mode: 'number' }).notNull(), // Actual amount for this day

  // Pro-rata for partial periods
  prorate_numerator: bigint('prorate_numerator', { mode: 'number' }), // Hours or portion of day
  prorate_denominator: bigint('prorate_denominator', { mode: 'number' }), // Total hours in day (24)
  prorated_amount: bigint('prorated_amount', { mode: 'number' }), // If different from adjusted_daily_amount

  // Cumulative tracking
  cumulative_recognized: bigint('cumulative_recognized', { mode: 'number' }).notNull(), // Total recognized through this date
  remaining_to_recognize: bigint('remaining_to_recognize', { mode: 'number' }).notNull(), // Remaining after this date
  satisfaction_percentage: bigint('satisfaction_percentage', { mode: 'number' }).notNull(), // Basis points

  // Usage-based tracking (if applicable)
  units_delivered: bigint('units_delivered', { mode: 'number' }),
  unit_rate: bigint('unit_rate', { mode: 'number' }), // Rate per unit in cents

  // Milestone tracking (if applicable)
  milestone_achieved: boolean('milestone_achieved').default(false),
  milestone_name: varchar('milestone_name', { length: 255 }),
  milestone_amount: bigint('milestone_amount', { mode: 'number' }),

  // Status
  status: varchar('status', { length: 50 }).default('CALCULATED').notNull(),
  // CALCULATED, POSTED, ADJUSTED, REVERSED

  posted_to_gl: boolean('posted_to_gl').default(false),
  gl_posting_date: date('gl_posting_date'),
  gl_journal_entry_id: varchar('gl_journal_entry_id', { length: 50 }),

  // Calculation metadata
  calculation_timestamp: timestamp('calculation_timestamp').notNull(),
  calculation_version: bigint('calculation_version', { mode: 'number' }).default(1),
  calculation_source: varchar('calculation_source', { length: 50 }), // AUTOMATED, MANUAL, RECALCULATION

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractDateIdx: index('idx_asc606_dra_contract_date').on(table.contract_id, table.accrual_date),
  obligationDateIdx: index('idx_asc606_dra_obligation_date').on(table.obligation_id, table.accrual_date),
  dateIdx: index('idx_asc606_dra_date').on(table.accrual_date),
  periodIdx: index('idx_asc606_dra_period').on(table.period_label),
  fiscalIdx: index('idx_asc606_dra_fiscal').on(table.fiscal_year, table.fiscal_quarter, table.fiscal_month),
  statusIdx: index('idx_asc606_dra_status').on(table.status),
  glPostingIdx: index('idx_asc606_dra_gl_posting').on(table.posted_to_gl),
  patientDateIdx: index('idx_asc606_dra_patient_date').on(table.patient_id, table.accrual_date),
  uniqueDailyAccrual: uniqueIndex('idx_asc606_dra_unique').on(table.contract_id, table.obligation_id, table.accrual_date)
}));

// ============================================
// TABLE 7: CONTRACT MODIFICATIONS
// ============================================
// Handle contract amendments and changes
export const asc606_contract_modifications = pgTable('asc606_contract_modifications', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Contract reference
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),

  // Modification identification
  modification_number: varchar('modification_number', { length: 50 }).notNull(),
  modification_date: date('modification_date').notNull(),
  effective_date: date('effective_date').notNull(),

  // Modification type (ASC 606-10-25-10 through 25-13)
  modification_type: varchar('modification_type', { length: 50 }).notNull(),
  // SEPARATE_CONTRACT - Treated as separate contract (new distinct goods/services at SSP)
  // TERMINATION_AND_NEW - Terminate old, create new (reallocation prospectively)
  // CONTINUATION - Part of existing contract (cumulative catch-up adjustment)

  // Modification details
  modification_description: text('modification_description'),
  scope_change: text('scope_change'), // Description of scope change
  price_change: text('price_change'), // Description of price change

  // Before modification
  previous_total_price: bigint('previous_total_price', { mode: 'number' }), // In cents
  previous_remaining_price: bigint('previous_remaining_price', { mode: 'number' }),
  previous_satisfaction_percentage: bigint('previous_satisfaction_percentage', { mode: 'number' }), // Basis points

  // After modification
  new_total_price: bigint('new_total_price', { mode: 'number' }), // In cents
  price_change_amount: bigint('price_change_amount', { mode: 'number' }), // Increase/decrease

  // Catch-up adjustment (for CONTINUATION type)
  requires_catch_up: boolean('requires_catch_up').default(false),
  catch_up_amount: bigint('catch_up_amount', { mode: 'number' }), // In cents
  catch_up_recognized_date: date('catch_up_recognized_date'),

  // New performance obligations (for SEPARATE_CONTRACT or additions)
  adds_new_obligations: boolean('adds_new_obligations').default(false),
  new_obligations: jsonb('new_obligations'), // Array of new obligation details

  // Terminated obligations
  terminates_obligations: boolean('terminates_obligations').default(false),
  terminated_obligations: jsonb('terminated_obligations'), // Array of terminated obligation IDs

  // Reallocation required
  requires_reallocation: boolean('requires_reallocation').default(false),
  reallocation_method: varchar('reallocation_method', { length: 50 }),
  // PROSPECTIVE - Reallocate remaining consideration
  // RETROSPECTIVE - Cumulative catch-up

  // Status
  modification_status: varchar('modification_status', { length: 50 }).default('PENDING').notNull(),
  // PENDING, APPROVED, APPLIED, REJECTED

  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),
  applied_at: timestamp('applied_at'),

  // Metadata
  supporting_documentation: jsonb('supporting_documentation'), // Links to amendment documents
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_cm_contract').on(table.contract_id),
  effectiveDateIdx: index('idx_asc606_cm_effective_date').on(table.effective_date),
  statusIdx: index('idx_asc606_cm_status').on(table.modification_status),
  typeIdx: index('idx_asc606_cm_type').on(table.modification_type)
}));

// ============================================
// TABLE 8: REVENUE SCHEDULES
// ============================================
// Pre-calculated recognition schedules for contracts
export const asc606_revenue_schedules = pgTable('asc606_revenue_schedules', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),
  obligation_id: bigint('obligation_id', { mode: 'number' }).references(() => asc606_performance_obligations.id).notNull(),

  // Schedule identification
  schedule_version: bigint('schedule_version', { mode: 'number' }).default(1).notNull(),
  is_current: boolean('is_current').default(true),
  generated_at: timestamp('generated_at').notNull(),

  // Schedule period
  schedule_start_date: date('schedule_start_date').notNull(),
  schedule_end_date: date('schedule_end_date').notNull(),
  total_days: bigint('total_days', { mode: 'number' }).notNull(),

  // Recognition pattern
  recognition_pattern: varchar('recognition_pattern', { length: 50 }).notNull(),

  // Total amounts (in cents)
  total_to_recognize: bigint('total_to_recognize', { mode: 'number' }).notNull(),
  recognized_to_date: bigint('recognized_to_date', { mode: 'number' }).default(0),
  remaining_to_recognize: bigint('remaining_to_recognize', { mode: 'number' }).notNull(),

  // Daily calculation parameters
  base_daily_rate: bigint('base_daily_rate', { mode: 'number' }).notNull(), // Standard rate in cents

  // Calendar adjustments
  calendar_adjustments: jsonb('calendar_adjustments'),
  // { leap_year_handling: 'PROPORTIONAL', month_end_adjustment: 'PRO_RATA' }

  // Pre-calculated monthly totals for performance
  monthly_schedule: jsonb('monthly_schedule'),
  // Array of { period: 'YYYY-MM', days: number, amount: cents, is_partial: boolean }

  // Status
  schedule_status: varchar('schedule_status', { length: 50 }).default('ACTIVE').notNull(),
  // DRAFT, ACTIVE, SUPERSEDED, TERMINATED

  superseded_by_id: bigint('superseded_by_id', { mode: 'number' }),
  superseded_date: date('superseded_date'),
  superseded_reason: text('superseded_reason'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_rs_contract').on(table.contract_id),
  obligationIdx: index('idx_asc606_rs_obligation').on(table.obligation_id),
  currentIdx: index('idx_asc606_rs_current').on(table.contract_id, table.obligation_id, table.is_current),
  statusIdx: index('idx_asc606_rs_status').on(table.schedule_status)
}));

// ============================================
// TABLE 9: DEFERRALS AND ADJUSTMENTS
// ============================================
// Track deferred revenue and adjustments
export const asc606_deferrals = pgTable('asc606_deferrals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),
  obligation_id: bigint('obligation_id', { mode: 'number' }).references(() => asc606_performance_obligations.id),
  daily_accrual_id: bigint('daily_accrual_id', { mode: 'number' }).references(() => asc606_daily_revenue_accruals.id),

  // Deferral type
  deferral_type: varchar('deferral_type', { length: 50 }).notNull(),
  // CONTRACT_LIABILITY - Payment received before performance
  // CONTRACT_ASSET - Performance before payment due
  // DEFERRED_REVENUE - Revenue deferred for accounting purposes
  // UNBILLED_RECEIVABLE - Revenue recognized before billing

  // Deferral details
  deferral_date: date('deferral_date').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(), // In cents
  reason: text('reason').notNull(),

  // Period
  period_label: varchar('period_label', { length: 7 }).notNull(), // YYYY-MM
  fiscal_year: bigint('fiscal_year', { mode: 'number' }).notNull(),
  fiscal_quarter: bigint('fiscal_quarter', { mode: 'number' }).notNull(),

  // Release schedule
  expected_release_date: date('expected_release_date'),
  release_pattern: varchar('release_pattern', { length: 50 }), // IMMEDIATE, STRAIGHT_LINE, ON_SATISFACTION

  // Status
  status: varchar('status', { length: 50 }).default('DEFERRED').notNull(),
  // DEFERRED, PARTIALLY_RELEASED, RELEASED, WRITTEN_OFF

  released_amount: bigint('released_amount', { mode: 'number' }).default(0),
  remaining_amount: bigint('remaining_amount', { mode: 'number' }).notNull(),

  // Release tracking
  releases: jsonb('releases'),
  // Array of { date: date, amount: cents, reason: string, created_by: user_id }

  // GL tracking
  posted_to_gl: boolean('posted_to_gl').default(false),
  gl_account: varchar('gl_account', { length: 50 }),
  gl_journal_entry_id: varchar('gl_journal_entry_id', { length: 50 }),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_def_contract').on(table.contract_id),
  obligationIdx: index('idx_asc606_def_obligation').on(table.obligation_id),
  typeIdx: index('idx_asc606_def_type').on(table.deferral_type),
  periodIdx: index('idx_asc606_def_period').on(table.period_label),
  statusIdx: index('idx_asc606_def_status').on(table.status),
  releaseDateIdx: index('idx_asc606_def_release_date').on(table.expected_release_date)
}));

// ============================================
// TABLE 10: AUDIT TRAIL
// ============================================
// Immutable calculation audit trail for compliance
export const asc606_calculation_audit = pgTable('asc606_calculation_audit', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // References
  contract_id: bigint('contract_id', { mode: 'number' }).references(() => asc606_contracts.id).notNull(),
  obligation_id: bigint('obligation_id', { mode: 'number' }).references(() => asc606_performance_obligations.id),
  daily_accrual_id: bigint('daily_accrual_id', { mode: 'number' }).references(() => asc606_daily_revenue_accruals.id),

  // Audit event
  event_type: varchar('event_type', { length: 50 }).notNull(),
  // CALCULATION, ADJUSTMENT, REVERSAL, REALLOCATION, MODIFICATION, PERIOD_CLOSE

  event_date: date('event_date').notNull(),
  event_timestamp: timestamp('event_timestamp').notNull(),

  // Event details
  event_description: text('event_description').notNull(),

  // Before state
  before_state: jsonb('before_state'),

  // After state
  after_state: jsonb('after_state'),

  // Change details
  change_amount: bigint('change_amount', { mode: 'number' }), // Net change in cents
  change_reason: text('change_reason'),

  // Calculation details
  calculation_inputs: jsonb('calculation_inputs'),
  calculation_formula: text('calculation_formula'),
  calculation_result: jsonb('calculation_result'),

  // System information
  system_version: varchar('system_version', { length: 50 }),
  calculation_engine_version: varchar('calculation_engine_version', { length: 50 }),

  // Triggering source
  trigger_source: varchar('trigger_source', { length: 50 }),
  // AUTOMATED_DAILY_JOB, MANUAL_ENTRY, CONTRACT_MODIFICATION, PERIOD_CLOSE, RECALCULATION

  trigger_reference_id: varchar('trigger_reference_id', { length: 100 }),

  // Metadata (immutable after creation)
  metadata: jsonb('metadata'),

  // Audit - NO updated_at for immutability
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  contractIdx: index('idx_asc606_audit_contract').on(table.contract_id),
  obligationIdx: index('idx_asc606_audit_obligation').on(table.obligation_id),
  eventDateIdx: index('idx_asc606_audit_event_date').on(table.event_date),
  eventTypeIdx: index('idx_asc606_audit_event_type').on(table.event_type),
  timestampIdx: index('idx_asc606_audit_timestamp').on(table.event_timestamp)
}));

// ============================================
// TABLE 11: RECONCILIATION
// ============================================
// Reconciliation with billing/invoicing
export const asc606_reconciliation = pgTable('asc606_reconciliation', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reconciliation period
  period_label: varchar('period_label', { length: 7 }).notNull(), // YYYY-MM
  fiscal_year: bigint('fiscal_year', { mode: 'number' }).notNull(),
  fiscal_quarter: bigint('fiscal_quarter', { mode: 'number' }).notNull(),

  // Revenue amounts (in cents)
  total_recognized_revenue: bigint('total_recognized_revenue', { mode: 'number' }).notNull(),
  total_billed_revenue: bigint('total_billed_revenue', { mode: 'number' }).notNull(),
  variance_amount: bigint('variance_amount', { mode: 'number' }).notNull(),
  variance_percentage: bigint('variance_percentage', { mode: 'number' }), // Basis points

  // Breakdown
  deferred_revenue_beginning: bigint('deferred_revenue_beginning', { mode: 'number' }),
  deferred_revenue_ending: bigint('deferred_revenue_ending', { mode: 'number' }),
  unbilled_receivables_beginning: bigint('unbilled_receivables_beginning', { mode: 'number' }),
  unbilled_receivables_ending: bigint('unbilled_receivables_ending', { mode: 'number' }),

  // Contract assets and liabilities
  contract_assets: bigint('contract_assets', { mode: 'number' }),
  contract_liabilities: bigint('contract_liabilities', { mode: 'number' }),

  // Reconciliation items
  reconciliation_items: jsonb('reconciliation_items'),
  // Array of { description: string, amount: cents, category: string }

  // Status
  status: varchar('status', { length: 50 }).default('DRAFT').notNull(),
  // DRAFT, IN_PROGRESS, COMPLETED, APPROVED, LOCKED

  is_reconciled: boolean('is_reconciled').default(false),
  reconciled_at: timestamp('reconciled_at'),
  reconciled_by_id: text('reconciled_by_id').references(() => users.id),

  // Approval
  approved: boolean('approved').default(false),
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),

  // Variance explanation
  variance_explanation: text('variance_explanation'),
  requires_adjustment: boolean('requires_adjustment').default(false),
  adjustment_journal_entry_id: varchar('adjustment_journal_entry_id', { length: 50 }),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  periodIdx: uniqueIndex('idx_asc606_recon_period').on(table.period_label),
  fiscalIdx: index('idx_asc606_recon_fiscal').on(table.fiscal_year, table.fiscal_quarter),
  statusIdx: index('idx_asc606_recon_status').on(table.status)
}));
