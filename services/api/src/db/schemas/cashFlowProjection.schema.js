import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, decimal, date, index } from 'drizzle-orm/pg-core';
import { payers } from './billing.schema.js';
import { users } from './user.schema.js';

/**
 * Cash Flow Projection Schema
 * Comprehensive data model for cash flow forecasting with payment timing and collection forecasts
 *
 * Tables:
 * 1. payment_schedules - Scheduled payment obligations (payroll, rent, vendors)
 * 2. expense_categories - Categorization of expenses for forecasting
 * 3. recurring_revenue_streams - Recurring revenue with payment cycles
 * 4. historical_collection_patterns - Historical collection rate patterns by customer/segment
 * 5. cash_flow_forecast_periods - Rolling projections for configurable time periods
 * 6. cash_flow_scenarios - Scenario modeling with adjustable assumptions
 * 7. cash_flow_audit_log - Audit trail for assumption changes
 */

// ============================================
// TABLE 1: EXPENSE CATEGORIES
// ============================================
// Categorization of expenses for forecasting and reporting
export const expense_categories = pgTable('expense_categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Category identification
  category_code: varchar('category_code', { length: 50 }).unique().notNull(),
  category_name: varchar('category_name', { length: 255 }).notNull(),
  category_type: varchar('category_type', { length: 50 }).notNull(), // PAYROLL, VENDOR, RENT, UTILITIES, SUPPLIES, CAPITAL_EXPENDITURE, OTHER

  // Parent category for hierarchical structure
  parent_category_id: bigint('parent_category_id', { mode: 'number' }).references(() => expense_categories.id),

  // Forecasting defaults
  default_payment_frequency: varchar('default_payment_frequency', { length: 50 }), // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
  is_fixed_expense: boolean('is_fixed_expense').default(false), // Fixed vs variable expense
  seasonal_variance_expected: boolean('seasonal_variance_expected').default(false),

  // Active status
  is_active: boolean('is_active').default(true).notNull(),

  // Metadata
  description: text('description'),
  metadata: jsonb('metadata'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// ============================================
// TABLE 2: PAYMENT SCHEDULES
// ============================================
// Scheduled payment obligations (payroll, rent, vendors, capital expenditures)
export const payment_schedules = pgTable('payment_schedules', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Schedule identification
  schedule_name: varchar('schedule_name', { length: 255 }).notNull(),
  schedule_type: varchar('schedule_type', { length: 50 }).notNull(), // PAYROLL, RENT, VENDOR, UTILITY, INSURANCE, CAPITAL_EXPENSE, LOAN_PAYMENT, TAX, OTHER

  // Category reference
  expense_category_id: bigint('expense_category_id', { mode: 'number' }).references(() => expense_categories.id),

  // Vendor/Payee information
  payee_name: varchar('payee_name', { length: 255 }),
  payee_id: varchar('payee_id', { length: 100 }), // External vendor ID

  // Payment amount (in cents)
  base_amount: bigint('base_amount', { mode: 'number' }).notNull(), // Base scheduled amount
  variable_component: bigint('variable_component', { mode: 'number' }).default(0), // Variable portion (e.g., overtime)
  estimated_total: bigint('estimated_total', { mode: 'number' }).notNull(), // Base + estimated variable

  // Payment frequency and timing
  payment_frequency: varchar('payment_frequency', { length: 50 }).notNull(), // WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
  payment_day: bigint('payment_day', { mode: 'number' }), // Day of month/week for payment
  payment_week: bigint('payment_week', { mode: 'number' }), // Week number for biweekly/monthly
  next_payment_date: date('next_payment_date').notNull(),
  last_payment_date: date('last_payment_date'),

  // Schedule duration
  effective_start_date: date('effective_start_date').notNull(),
  effective_end_date: date('effective_end_date'), // Null for ongoing
  is_perpetual: boolean('is_perpetual').default(true),

  // Early payment discount
  early_payment_discount_rate: bigint('early_payment_discount_rate', { mode: 'number' }), // Basis points (e.g., 200 = 2%)
  early_payment_discount_days: bigint('early_payment_discount_days', { mode: 'number' }), // Days before due date

  // Late payment penalty
  late_payment_penalty_rate: bigint('late_payment_penalty_rate', { mode: 'number' }), // Basis points
  grace_period_days: bigint('grace_period_days', { mode: 'number' }),

  // Priority for cash management
  priority_level: varchar('priority_level', { length: 20 }).default('NORMAL').notNull(), // CRITICAL, HIGH, NORMAL, LOW, DEFERRABLE
  can_be_deferred: boolean('can_be_deferred').default(false),
  max_deferral_days: bigint('max_deferral_days', { mode: 'number' }),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, PAUSED, COMPLETED, CANCELLED

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  typeIdx: index('idx_payment_schedules_type').on(table.schedule_type),
  nextPaymentIdx: index('idx_payment_schedules_next_payment').on(table.next_payment_date),
  priorityIdx: index('idx_payment_schedules_priority').on(table.priority_level),
}));

// ============================================
// TABLE 3: RECURRING REVENUE STREAMS
// ============================================
// Recurring revenue streams with payment cycles
export const recurring_revenue_streams = pgTable('recurring_revenue_streams', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Stream identification
  stream_name: varchar('stream_name', { length: 255 }).notNull(),
  stream_type: varchar('stream_type', { length: 50 }).notNull(), // PATIENT_SERVICE, CONTRACT, SUBSCRIPTION, GRANT, OTHER

  // Payer reference
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  customer_segment: varchar('customer_segment', { length: 100 }), // MEDICARE, MEDICAID, COMMERCIAL, PRIVATE_PAY

  // Revenue amount (in cents)
  expected_monthly_revenue: bigint('expected_monthly_revenue', { mode: 'number' }).notNull(),
  minimum_revenue: bigint('minimum_revenue', { mode: 'number' }), // Guaranteed minimum
  maximum_revenue: bigint('maximum_revenue', { mode: 'number' }), // Cap if applicable

  // Collection timing
  payment_cycle: varchar('payment_cycle', { length: 50 }).notNull(), // WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY
  expected_collection_day: bigint('expected_collection_day', { mode: 'number' }), // Day of payment cycle
  average_days_to_collection: bigint('average_days_to_collection', { mode: 'number' }),

  // Collection probability (basis points 0-10000)
  base_collection_rate: bigint('base_collection_rate', { mode: 'number' }).default(10000), // Expected collection rate
  historical_collection_rate: bigint('historical_collection_rate', { mode: 'number' }), // Actual historical rate

  // Duration
  effective_start_date: date('effective_start_date').notNull(),
  effective_end_date: date('effective_end_date'), // Null for ongoing

  // Seasonal factors
  seasonal_adjustment_factors: jsonb('seasonal_adjustment_factors'), // { jan: 1.0, feb: 0.95, ... }
  is_seasonal: boolean('is_seasonal').default(false),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, PAUSED, ENDED

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  typeIdx: index('idx_recurring_revenue_type').on(table.stream_type),
  segmentIdx: index('idx_recurring_revenue_segment').on(table.customer_segment),
}));

// ============================================
// TABLE 4: HISTORICAL COLLECTION PATTERNS
// ============================================
// Historical collection rate patterns by customer/segment for training models
export const historical_collection_patterns = pgTable('historical_collection_patterns', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Pattern identification
  pattern_period: varchar('pattern_period', { length: 7 }).notNull(), // YYYY-MM
  pattern_type: varchar('pattern_type', { length: 50 }).notNull(), // PAYER, SEGMENT, OVERALL

  // Dimension
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  customer_segment: varchar('customer_segment', { length: 100 }),

  // Volume metrics
  total_invoiced_count: bigint('total_invoiced_count', { mode: 'number' }).default(0),
  total_collected_count: bigint('total_collected_count', { mode: 'number' }).default(0),

  // Financial metrics (in cents)
  total_invoiced_amount: bigint('total_invoiced_amount', { mode: 'number' }).default(0),
  total_collected_amount: bigint('total_collected_amount', { mode: 'number' }).default(0),
  total_written_off_amount: bigint('total_written_off_amount', { mode: 'number' }).default(0),

  // Collection rates (basis points 0-10000)
  collection_rate: bigint('collection_rate', { mode: 'number' }), // collected / invoiced
  write_off_rate: bigint('write_off_rate', { mode: 'number' }), // written_off / invoiced

  // Timing metrics (days)
  avg_days_to_collection: decimal('avg_days_to_collection', { precision: 10, scale: 2 }),
  median_days_to_collection: bigint('median_days_to_collection', { mode: 'number' }),
  std_dev_days_to_collection: decimal('std_dev_days_to_collection', { precision: 10, scale: 2 }),

  // Aging analysis at period end (basis points showing % in each bucket)
  pct_current: bigint('pct_current', { mode: 'number' }), // 0-30 days
  pct_31_60: bigint('pct_31_60', { mode: 'number' }), // 31-60 days
  pct_61_90: bigint('pct_61_90', { mode: 'number' }), // 61-90 days
  pct_91_120: bigint('pct_91_120', { mode: 'number' }), // 91-120 days
  pct_over_120: bigint('pct_over_120', { mode: 'number' }), // 120+ days

  // Collection probability by aging bucket (basis points)
  collection_prob_current: bigint('collection_prob_current', { mode: 'number' }),
  collection_prob_31_60: bigint('collection_prob_31_60', { mode: 'number' }),
  collection_prob_61_90: bigint('collection_prob_61_90', { mode: 'number' }),
  collection_prob_91_120: bigint('collection_prob_91_120', { mode: 'number' }),
  collection_prob_over_120: bigint('collection_prob_over_120', { mode: 'number' }),

  // Seasonal indicators
  is_peak_month: boolean('is_peak_month').default(false),
  is_slow_month: boolean('is_slow_month').default(false),
  seasonal_factor: decimal('seasonal_factor', { precision: 5, scale: 3 }), // Multiplier (e.g., 1.15 for 15% above average)

  // Data quality
  data_completeness: bigint('data_completeness', { mode: 'number' }), // Basis points indicating data quality
  sample_size: bigint('sample_size', { mode: 'number' }),

  // Metadata
  calculation_date: timestamp('calculation_date').notNull(),
  metadata: jsonb('metadata'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  periodIdx: index('idx_historical_collection_period').on(table.pattern_period),
  payerIdx: index('idx_historical_collection_payer').on(table.payer_id),
  segmentIdx: index('idx_historical_collection_segment').on(table.customer_segment),
}));

// ============================================
// TABLE 5: CASH FLOW FORECAST PERIODS
// ============================================
// Rolling projections for configurable time periods (30/60/90 days, quarterly, annual)
export const cash_flow_forecast_periods = pgTable('cash_flow_forecast_periods', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Forecast identification
  forecast_date: date('forecast_date').notNull(), // Date forecast was created
  forecast_period_start: date('forecast_period_start').notNull(),
  forecast_period_end: date('forecast_period_end').notNull(),
  period_label: varchar('period_label', { length: 50 }).notNull(), // "Week 1", "2025-01", "Q1-2025"
  period_type: varchar('period_type', { length: 50 }).notNull(), // WEEKLY, MONTHLY, QUARTERLY, ANNUAL

  // Horizon tracking
  horizon_days: bigint('horizon_days', { mode: 'number' }).notNull(), // 30, 60, 90, etc.
  forecast_horizon: varchar('forecast_horizon', { length: 50 }).notNull(), // 30_DAY, 60_DAY, 90_DAY, QUARTERLY, ANNUAL

  // Scenario reference
  scenario_id: bigint('scenario_id', { mode: 'number' }).references(() => cash_flow_scenarios.id),
  scenario_type: varchar('scenario_type', { length: 50 }).default('BASE'), // BASE, OPTIMISTIC, PESSIMISTIC, CUSTOM

  // Opening position (in cents)
  opening_cash_balance: bigint('opening_cash_balance', { mode: 'number' }),

  // Projected cash inflows (in cents)
  projected_collections: bigint('projected_collections', { mode: 'number' }).notNull(),
  projected_appeal_recoveries: bigint('projected_appeal_recoveries', { mode: 'number' }).default(0),
  projected_recurring_revenue: bigint('projected_recurring_revenue', { mode: 'number' }).default(0),
  projected_other_income: bigint('projected_other_income', { mode: 'number' }).default(0),
  total_projected_inflows: bigint('total_projected_inflows', { mode: 'number' }).notNull(),

  // Projected cash outflows (in cents)
  projected_payroll: bigint('projected_payroll', { mode: 'number' }).default(0),
  projected_rent: bigint('projected_rent', { mode: 'number' }).default(0),
  projected_vendor_payments: bigint('projected_vendor_payments', { mode: 'number' }).default(0),
  projected_utilities: bigint('projected_utilities', { mode: 'number' }).default(0),
  projected_capital_expenditure: bigint('projected_capital_expenditure', { mode: 'number' }).default(0),
  projected_loan_payments: bigint('projected_loan_payments', { mode: 'number' }).default(0),
  projected_taxes: bigint('projected_taxes', { mode: 'number' }).default(0),
  projected_other_expenses: bigint('projected_other_expenses', { mode: 'number' }).default(0),
  total_projected_outflows: bigint('total_projected_outflows', { mode: 'number' }).notNull(),

  // Net cash flow
  projected_net_cash_flow: bigint('projected_net_cash_flow', { mode: 'number' }).notNull(),
  projected_ending_cash: bigint('projected_ending_cash', { mode: 'number' }),

  // Key metrics
  minimum_cash_balance: bigint('minimum_cash_balance', { mode: 'number' }), // Lowest point during period
  minimum_cash_date: date('minimum_cash_date'), // Date of minimum
  peak_funding_requirement: bigint('peak_funding_requirement', { mode: 'number' }), // Max funding needed
  days_cash_on_hand: decimal('days_cash_on_hand', { precision: 10, scale: 2 }),

  // Actual vs projected (filled in after period ends)
  actual_collections: bigint('actual_collections', { mode: 'number' }),
  actual_outflows: bigint('actual_outflows', { mode: 'number' }),
  actual_net_cash_flow: bigint('actual_net_cash_flow', { mode: 'number' }),
  actual_ending_cash: bigint('actual_ending_cash', { mode: 'number' }),

  // Variance tracking (in cents and basis points)
  variance_collections: bigint('variance_collections', { mode: 'number' }),
  variance_collections_pct: bigint('variance_collections_pct', { mode: 'number' }), // Basis points
  variance_outflows: bigint('variance_outflows', { mode: 'number' }),
  variance_outflows_pct: bigint('variance_outflows_pct', { mode: 'number' }),
  variance_net_cash_flow: bigint('variance_net_cash_flow', { mode: 'number' }),
  variance_net_cash_flow_pct: bigint('variance_net_cash_flow_pct', { mode: 'number' }),

  // Confidence and methodology
  confidence_level: varchar('confidence_level', { length: 20 }), // HIGH, MEDIUM, LOW
  confidence_percentage: bigint('confidence_percentage', { mode: 'number' }), // Basis points
  methodology: varchar('methodology', { length: 100 }),
  data_sources: jsonb('data_sources'), // List of data sources used

  // Assumptions
  assumptions: jsonb('assumptions'), // Detailed assumptions used
  collection_rate_assumption: bigint('collection_rate_assumption', { mode: 'number' }), // Basis points
  late_payment_adjustment: bigint('late_payment_adjustment', { mode: 'number' }), // Basis points reduction for late payments

  // Status
  is_locked: boolean('is_locked').default(false),
  locked_at: timestamp('locked_at'),
  locked_by_id: text('locked_by_id').references(() => users.id),

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  periodIdx: index('idx_cf_forecast_period').on(table.period_label),
  horizonIdx: index('idx_cf_forecast_horizon').on(table.forecast_horizon),
  dateIdx: index('idx_cf_forecast_date').on(table.forecast_date),
  scenarioIdx: index('idx_cf_forecast_scenario').on(table.scenario_id),
}));

// ============================================
// TABLE 6: CASH FLOW SCENARIOS
// ============================================
// Scenario modeling with adjustable assumptions
export const cash_flow_scenarios = pgTable('cash_flow_scenarios', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Scenario identification
  scenario_name: varchar('scenario_name', { length: 255 }).notNull(),
  scenario_type: varchar('scenario_type', { length: 50 }).notNull(), // BASE, OPTIMISTIC, PESSIMISTIC, CUSTOM, STRESS_TEST

  // Scenario description
  description: text('description'),

  // Collection assumptions (basis points)
  collection_rate_adjustment: bigint('collection_rate_adjustment', { mode: 'number' }).default(0), // +/- adjustment to base rate
  days_to_collection_adjustment: bigint('days_to_collection_adjustment', { mode: 'number' }).default(0), // +/- days adjustment
  write_off_rate_adjustment: bigint('write_off_rate_adjustment', { mode: 'number' }).default(0), // +/- adjustment

  // Revenue assumptions (basis points)
  revenue_growth_rate: bigint('revenue_growth_rate', { mode: 'number' }).default(0), // Annual growth rate
  seasonal_variance_factor: decimal('seasonal_variance_factor', { precision: 5, scale: 3 }).default('1.0'), // Multiplier

  // Expense assumptions (basis points)
  expense_inflation_rate: bigint('expense_inflation_rate', { mode: 'number' }).default(0), // Annual inflation
  payroll_growth_rate: bigint('payroll_growth_rate', { mode: 'number' }).default(0),
  vendor_cost_adjustment: bigint('vendor_cost_adjustment', { mode: 'number' }).default(0),

  // Timing assumptions
  early_payment_utilization: bigint('early_payment_utilization', { mode: 'number' }), // % utilizing early payment discounts
  late_payment_probability: bigint('late_payment_probability', { mode: 'number' }), // % of payments that are late

  // Risk factors
  collection_risk_factor: decimal('collection_risk_factor', { precision: 5, scale: 3 }).default('1.0'), // Risk multiplier
  expense_risk_factor: decimal('expense_risk_factor', { precision: 5, scale: 3 }).default('1.0'),

  // Multi-currency (future support)
  currency_code: varchar('currency_code', { length: 3 }).default('USD'),
  exchange_rate_assumption: decimal('exchange_rate_assumption', { precision: 10, scale: 4 }),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  is_default: boolean('is_default').default(false), // Default scenario

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  typeIdx: index('idx_cf_scenarios_type').on(table.scenario_type),
  defaultIdx: index('idx_cf_scenarios_default').on(table.is_default),
}));

// ============================================
// TABLE 7: CASH FLOW AUDIT LOG
// ============================================
// Audit trail for assumption changes
export const cash_flow_audit_log = pgTable('cash_flow_audit_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Entity reference
  entity_type: varchar('entity_type', { length: 50 }).notNull(), // SCENARIO, FORECAST, PAYMENT_SCHEDULE, REVENUE_STREAM
  entity_id: bigint('entity_id', { mode: 'number' }).notNull(),

  // Change details
  action_type: varchar('action_type', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, LOCK, UNLOCK
  field_changed: varchar('field_changed', { length: 100 }),
  old_value: text('old_value'),
  new_value: text('new_value'),

  // Change reason
  change_reason: text('change_reason'),

  // Context
  context: jsonb('context'), // Additional context about the change

  // Audit
  changed_by_id: text('changed_by_id').references(() => users.id).notNull(),
  changed_at: timestamp('changed_at').defaultNow().notNull(),
  ip_address: varchar('ip_address', { length: 50 }),
  user_agent: text('user_agent')
}, (table) => ({
  entityIdx: index('idx_cf_audit_entity').on(table.entity_type, table.entity_id),
  userIdx: index('idx_cf_audit_user').on(table.changed_by_id),
  dateIdx: index('idx_cf_audit_date').on(table.changed_at),
}));

// ============================================
// TABLE 8: AR RECEIVABLES SNAPSHOT
// ============================================
// Snapshot of AR for cash flow projection input
export const ar_receivables_snapshot = pgTable('ar_receivables_snapshot', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Snapshot identification
  snapshot_date: date('snapshot_date').notNull(),
  snapshot_type: varchar('snapshot_type', { length: 50 }).default('DAILY').notNull(), // DAILY, WEEKLY, MONTHLY

  // Dimension
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  customer_segment: varchar('customer_segment', { length: 100 }),

  // Total outstanding AR (in cents)
  total_outstanding: bigint('total_outstanding', { mode: 'number' }).notNull(),

  // Aging buckets (in cents)
  ar_current: bigint('ar_current', { mode: 'number' }).default(0), // 0-30 days
  ar_31_60: bigint('ar_31_60', { mode: 'number' }).default(0),
  ar_61_90: bigint('ar_61_90', { mode: 'number' }).default(0),
  ar_91_120: bigint('ar_91_120', { mode: 'number' }).default(0),
  ar_over_120: bigint('ar_over_120', { mode: 'number' }).default(0),

  // Projected collections from this AR (in cents)
  projected_collection_7_days: bigint('projected_collection_7_days', { mode: 'number' }),
  projected_collection_14_days: bigint('projected_collection_14_days', { mode: 'number' }),
  projected_collection_30_days: bigint('projected_collection_30_days', { mode: 'number' }),
  projected_collection_60_days: bigint('projected_collection_60_days', { mode: 'number' }),
  projected_collection_90_days: bigint('projected_collection_90_days', { mode: 'number' }),

  // DSO at snapshot
  days_sales_outstanding: decimal('days_sales_outstanding', { precision: 10, scale: 2 }),

  // Invoice/claim counts
  invoice_count: bigint('invoice_count', { mode: 'number' }),
  claim_count: bigint('claim_count', { mode: 'number' }),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('idx_ar_snapshot_date').on(table.snapshot_date),
  payerIdx: index('idx_ar_snapshot_payer').on(table.payer_id),
}));

// ============================================
// TABLE 9: AP PAYABLES SNAPSHOT
// ============================================
// Snapshot of AP for cash flow projection input
export const ap_payables_snapshot = pgTable('ap_payables_snapshot', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Snapshot identification
  snapshot_date: date('snapshot_date').notNull(),
  snapshot_type: varchar('snapshot_type', { length: 50 }).default('DAILY').notNull(),

  // Dimension
  expense_category_id: bigint('expense_category_id', { mode: 'number' }).references(() => expense_categories.id),
  vendor_id: varchar('vendor_id', { length: 100 }),
  vendor_name: varchar('vendor_name', { length: 255 }),

  // Total outstanding AP (in cents)
  total_outstanding: bigint('total_outstanding', { mode: 'number' }).notNull(),

  // Aging buckets (in cents)
  ap_current: bigint('ap_current', { mode: 'number' }).default(0), // Not yet due
  ap_due_7_days: bigint('ap_due_7_days', { mode: 'number' }).default(0),
  ap_due_14_days: bigint('ap_due_14_days', { mode: 'number' }).default(0),
  ap_due_30_days: bigint('ap_due_30_days', { mode: 'number' }).default(0),
  ap_overdue: bigint('ap_overdue', { mode: 'number' }).default(0),

  // Expected payment schedule (in cents)
  expected_payment_7_days: bigint('expected_payment_7_days', { mode: 'number' }),
  expected_payment_14_days: bigint('expected_payment_14_days', { mode: 'number' }),
  expected_payment_30_days: bigint('expected_payment_30_days', { mode: 'number' }),
  expected_payment_60_days: bigint('expected_payment_60_days', { mode: 'number' }),
  expected_payment_90_days: bigint('expected_payment_90_days', { mode: 'number' }),

  // Early payment discount available (in cents)
  early_discount_available: bigint('early_discount_available', { mode: 'number' }),
  early_discount_deadline: date('early_discount_deadline'),

  // Invoice counts
  invoice_count: bigint('invoice_count', { mode: 'number' }),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  dateIdx: index('idx_ap_snapshot_date').on(table.snapshot_date),
  categoryIdx: index('idx_ap_snapshot_category').on(table.expense_category_id),
}));
