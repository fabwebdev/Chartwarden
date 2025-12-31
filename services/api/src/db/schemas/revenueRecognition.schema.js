import { pgTable, bigint, varchar, text, date, timestamp, boolean, jsonb, decimal, index } from 'drizzle-orm/pg-core';
import { claims, payers } from './billing.schema.js';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Phase 3D: Revenue Recognition & Forecasting Schema
 *
 * Purpose: Track revenue accrual, forecasting, and cash flow projection
 *
 * Tables:
 * 1. revenue_accruals - Expected revenue tracking by claim
 * 2. revenue_adjustments - Adjustments to accrued revenue
 * 3. collection_forecasts - Projected cash collections
 * 4. payer_payment_patterns - Historical payment behavior analytics
 * 5. revenue_recognition_periods - Period close tracking
 * 6. cash_flow_projections - Cash flow forecasting
 */

// ============================================
// TABLE 1: REVENUE ACCRUALS
// ============================================
// Track expected revenue as claims progress through lifecycle
export const revenue_accruals = pgTable('revenue_accruals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Claim and patient reference
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Accrual identification
  accrual_id: varchar('accrual_id', { length: 50 }).unique().notNull(),
  accrual_date: date('accrual_date').notNull(),

  // Service information
  service_date_from: date('service_date_from').notNull(),
  service_date_to: date('service_date_to').notNull(),
  service_month: varchar('service_month', { length: 7 }).notNull(), // YYYY-MM format

  // Financial amounts (in cents)
  billed_amount: bigint('billed_amount', { mode: 'number' }).notNull(),
  expected_reimbursement: bigint('expected_reimbursement', { mode: 'number' }).notNull(),
  accrued_amount: bigint('accrued_amount', { mode: 'number' }).notNull(),
  collected_amount: bigint('collected_amount', { mode: 'number' }).default(0),
  adjusted_amount: bigint('adjusted_amount', { mode: 'number' }).default(0),
  written_off_amount: bigint('written_off_amount', { mode: 'number' }).default(0),

  // Recognition method and status
  recognition_method: varchar('recognition_method', { length: 50 }).notNull(), // ON_SERVICE, ON_SUBMISSION, ON_PAYMENT
  recognition_status: varchar('recognition_status', { length: 50 }).default('ACCRUED').notNull(),
  recognition_date: date('recognition_date'),

  // Contract and reimbursement info
  contract_rate_type: varchar('contract_rate_type', { length: 50 }), // PER_DIEM, FFS, CAPITATED
  expected_payment_days: bigint('expected_payment_days', { mode: 'number' }), // Expected days to payment
  confidence_level: varchar('confidence_level', { length: 20 }), // HIGH, MEDIUM, LOW

  // Collection probability (0-10000 basis points = 0.00%-100.00%)
  collection_probability: bigint('collection_probability', { mode: 'number' }).default(10000),

  // Period assignment
  revenue_period: varchar('revenue_period', { length: 7 }).notNull(), // YYYY-MM
  fiscal_year: bigint('fiscal_year', { mode: 'number' }).notNull(),
  fiscal_quarter: bigint('fiscal_quarter', { mode: 'number' }).notNull(), // 1-4

  // Reversal tracking
  is_reversed: boolean('is_reversed').default(false),
  reversed_date: date('reversed_date'),
  reversal_reason: text('reversal_reason'),

  // Metadata
  calculation_method: text('calculation_method'), // Description of how expected reimbursement was calculated
  assumptions: jsonb('assumptions'), // Assumptions used in calculation
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// ============================================
// TABLE 2: REVENUE ADJUSTMENTS
// ============================================
// Track all adjustments to accrued revenue
export const revenue_adjustments = pgTable('revenue_adjustments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Accrual reference
  accrual_id: bigint('accrual_id', { mode: 'number' }).references(() => revenue_accruals.id).notNull(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Adjustment details
  adjustment_date: date('adjustment_date').notNull(),
  adjustment_type: varchar('adjustment_type', { length: 50 }).notNull(), // CONTRACTUAL, WRITE_OFF, BAD_DEBT, DENIAL, CORRECTION, APPEAL_RECOVERY
  adjustment_amount: bigint('adjustment_amount', { mode: 'number' }).notNull(), // Can be negative for reductions

  // Reason and source
  reason: text('reason').notNull(),
  source_type: varchar('source_type', { length: 50 }), // ERA, DENIAL, APPEAL, MANUAL, SYSTEM
  source_reference_id: varchar('source_reference_id', { length: 100 }), // Reference to source record

  // Related records
  denial_id: bigint('denial_id', { mode: 'number' }), // If related to denial
  appeal_id: bigint('appeal_id', { mode: 'number' }), // If related to appeal
  era_payment_id: bigint('era_payment_id', { mode: 'number' }), // If from ERA

  // Impact
  impacts_current_period: boolean('impacts_current_period').default(true),
  period_impacted: varchar('period_impacted', { length: 7 }), // YYYY-MM

  // Approval workflow
  requires_approval: boolean('requires_approval').default(false),
  approved: boolean('approved'),
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  accrualIdx: index('idx_revenue_adjustments_accrual').on(table.accrual_id),
  claimIdx: index('idx_revenue_adjustments_claim').on(table.claim_id),
  typeIdx: index('idx_revenue_adjustments_type').on(table.adjustment_type),
  periodIdx: index('idx_revenue_adjustments_period').on(table.period_impacted),
}));

// ============================================
// TABLE 3: COLLECTION FORECASTS
// ============================================
// Projected cash collections by period
export const collection_forecasts = pgTable('collection_forecasts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Period identification
  forecast_period: varchar('forecast_period', { length: 7 }).notNull(), // YYYY-MM
  forecast_created_date: date('forecast_created_date').notNull(),
  forecast_type: varchar('forecast_type', { length: 50 }).notNull(), // MONTHLY, QUARTERLY, YEARLY

  // Dimension (can forecast by payer, or total)
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  service_type: varchar('service_type', { length: 50 }), // HOSPICE, HOME_HEALTH, etc.

  // Forecasted amounts (in cents)
  forecasted_collections: bigint('forecasted_collections', { mode: 'number' }).notNull(),
  forecasted_writeoffs: bigint('forecasted_writeoffs', { mode: 'number' }),
  forecasted_denials: bigint('forecasted_denials', { mode: 'number' }),
  forecasted_appeals_recovery: bigint('forecasted_appeals_recovery', { mode: 'number' }),

  // Actual amounts for comparison
  actual_collections: bigint('actual_collections', { mode: 'number' }),
  actual_writeoffs: bigint('actual_writeoffs', { mode: 'number' }),
  variance_amount: bigint('variance_amount', { mode: 'number' }),
  variance_percentage: bigint('variance_percentage', { mode: 'number' }), // Basis points

  // Confidence and methodology
  confidence_level: varchar('confidence_level', { length: 20 }), // HIGH, MEDIUM, LOW
  confidence_percentage: bigint('confidence_percentage', { mode: 'number' }), // Basis points
  calculation_method: varchar('calculation_method', { length: 100 }).notNull(),

  // Assumptions
  assumptions: jsonb('assumptions'),
  historical_data_range: jsonb('historical_data_range'), // { start: date, end: date, months: number }

  // Status tracking
  forecast_status: varchar('forecast_status', { length: 50 }).default('DRAFT').notNull(),
  locked: boolean('locked').default(false),
  locked_at: timestamp('locked_at'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  periodIdx: index('idx_collection_forecasts_period').on(table.forecast_period),
  payerIdx: index('idx_collection_forecasts_payer').on(table.payer_id),
}));

// ============================================
// TABLE 4: PAYER PAYMENT PATTERNS
// ============================================
// Historical payment behavior analytics by payer
export const payer_payment_patterns = pgTable('payer_payment_patterns', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Payer reference
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id).notNull(),

  // Analysis period
  analysis_period_start: date('analysis_period_start').notNull(),
  analysis_period_end: date('analysis_period_end').notNull(),
  last_calculated: timestamp('last_calculated').notNull(),

  // Volume metrics
  total_claims_submitted: bigint('total_claims_submitted', { mode: 'number' }).default(0),
  total_claims_paid: bigint('total_claims_paid', { mode: 'number' }).default(0),
  total_claims_denied: bigint('total_claims_denied', { mode: 'number' }).default(0),
  total_claims_pending: bigint('total_claims_pending', { mode: 'number' }).default(0),

  // Financial metrics (in cents)
  total_billed_amount: bigint('total_billed_amount', { mode: 'number' }).default(0),
  total_paid_amount: bigint('total_paid_amount', { mode: 'number' }).default(0),
  total_denied_amount: bigint('total_denied_amount', { mode: 'number' }).default(0),
  total_adjusted_amount: bigint('total_adjusted_amount', { mode: 'number' }).default(0),

  // Timing metrics (days)
  avg_days_to_payment: decimal('avg_days_to_payment', { precision: 10, scale: 2 }),
  median_days_to_payment: bigint('median_days_to_payment', { mode: 'number' }),
  min_days_to_payment: bigint('min_days_to_payment', { mode: 'number' }),
  max_days_to_payment: bigint('max_days_to_payment', { mode: 'number' }),
  std_dev_days: decimal('std_dev_days', { precision: 10, scale: 2 }),

  // Rate metrics (basis points 0-10000)
  collection_rate: bigint('collection_rate', { mode: 'number' }), // paid / billed
  denial_rate: bigint('denial_rate', { mode: 'number' }), // denied / submitted
  clean_claim_rate: bigint('clean_claim_rate', { mode: 'number' }), // paid without issues
  appeal_success_rate: bigint('appeal_success_rate', { mode: 'number' }),

  // Payment behavior
  payment_reliability_score: bigint('payment_reliability_score', { mode: 'number' }), // 0-100
  payment_pattern: varchar('payment_pattern', { length: 50 }), // CONSISTENT, VARIABLE, IRREGULAR
  preferred_payment_day: bigint('preferred_payment_day', { mode: 'number' }), // Day of month or week

  // Seasonal patterns
  seasonal_variance: boolean('seasonal_variance'),
  peak_payment_months: jsonb('peak_payment_months'), // Array of month numbers
  slow_payment_months: jsonb('slow_payment_months'),

  // Risk assessment
  risk_level: varchar('risk_level', { length: 20 }), // LOW, MEDIUM, HIGH
  credit_score: bigint('credit_score', { mode: 'number' }), // 0-100
  bad_debt_likelihood: bigint('bad_debt_likelihood', { mode: 'number' }), // Basis points

  // Metadata
  calculation_notes: text('calculation_notes'),
  metadata: jsonb('metadata'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  payerIdx: index('idx_payer_payment_patterns_payer').on(table.payer_id),
}));

// ============================================
// TABLE 5: REVENUE RECOGNITION PERIODS
// ============================================
// Monthly/quarterly close tracking
export const revenue_recognition_periods = pgTable('revenue_recognition_periods', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Period identification
  period_type: varchar('period_type', { length: 20 }).notNull(), // MONTHLY, QUARTERLY, YEARLY
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),
  period_label: varchar('period_label', { length: 50 }).notNull(), // "2025-01", "2025-Q1", "2025"
  fiscal_year: bigint('fiscal_year', { mode: 'number' }).notNull(),
  fiscal_quarter: bigint('fiscal_quarter', { mode: 'number' }), // 1-4 for quarterly/monthly

  // Period status
  status: varchar('status', { length: 50 }).default('OPEN').notNull(), // OPEN, CLOSED, LOCKED, REOPENED
  closed_date: timestamp('closed_date'),
  locked_date: timestamp('locked_date'),
  closed_by_id: text('closed_by_id').references(() => users.id),
  locked_by_id: text('locked_by_id').references(() => users.id),

  // Revenue metrics (in cents)
  total_billed: bigint('total_billed', { mode: 'number' }).default(0),
  total_accrued: bigint('total_accrued', { mode: 'number' }).default(0),
  total_collected: bigint('total_collected', { mode: 'number' }).default(0),
  total_written_off: bigint('total_written_off', { mode: 'number' }).default(0),
  total_adjustments: bigint('total_adjustments', { mode: 'number' }).default(0),
  net_revenue: bigint('net_revenue', { mode: 'number' }).default(0),

  // Volume metrics
  total_claims: bigint('total_claims', { mode: 'number' }).default(0),
  total_patients: bigint('total_patients', { mode: 'number' }).default(0),
  total_service_days: bigint('total_service_days', { mode: 'number' }).default(0),

  // AR metrics (in cents)
  beginning_ar: bigint('beginning_ar', { mode: 'number' }),
  ending_ar: bigint('ending_ar', { mode: 'number' }),
  ar_change: bigint('ar_change', { mode: 'number' }),

  // DSO metrics
  days_sales_outstanding: decimal('days_sales_outstanding', { precision: 10, scale: 2 }),
  ar_aging_0_30: bigint('ar_aging_0_30', { mode: 'number' }),
  ar_aging_31_60: bigint('ar_aging_31_60', { mode: 'number' }),
  ar_aging_61_90: bigint('ar_aging_61_90', { mode: 'number' }),
  ar_aging_91_120: bigint('ar_aging_91_120', { mode: 'number' }),
  ar_aging_over_120: bigint('ar_aging_over_120', { mode: 'number' }),

  // Reconciliation
  reconciliation_complete: boolean('reconciliation_complete').default(false),
  reconciliation_date: timestamp('reconciliation_date'),
  reconciliation_notes: text('reconciliation_notes'),
  variances: jsonb('variances'), // Any reconciliation variances

  // Metadata
  summary_report_url: text('summary_report_url'),
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  periodIdx: index('idx_revenue_recognition_periods_period').on(table.period_label),
  statusIdx: index('idx_revenue_recognition_periods_status').on(table.status),
}));

// ============================================
// TABLE 6: CASH FLOW PROJECTIONS
// ============================================
// Cash flow forecasting and working capital analysis
export const cash_flow_projections = pgTable('cash_flow_projections', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Projection identification
  projection_date: date('projection_date').notNull(), // Date projection was created
  projection_for_period: varchar('projection_for_period', { length: 7 }).notNull(), // YYYY-MM
  projection_type: varchar('projection_type', { length: 50 }).notNull(), // SHORT_TERM, LONG_TERM, ROLLING

  // Time horizon
  weeks_ahead: bigint('weeks_ahead', { mode: 'number' }), // For short-term projections
  months_ahead: bigint('months_ahead', { mode: 'number' }), // For long-term projections

  // Projected cash inflows (in cents)
  projected_collections: bigint('projected_collections', { mode: 'number' }).notNull(),
  projected_appeal_recoveries: bigint('projected_appeal_recoveries', { mode: 'number' }),
  projected_other_income: bigint('projected_other_income', { mode: 'number' }),
  total_projected_inflows: bigint('total_projected_inflows', { mode: 'number' }).notNull(),

  // Projected cash outflows (in cents)
  projected_payroll: bigint('projected_payroll', { mode: 'number' }),
  projected_vendor_payments: bigint('projected_vendor_payments', { mode: 'number' }),
  projected_other_expenses: bigint('projected_other_expenses', { mode: 'number' }),
  total_projected_outflows: bigint('total_projected_outflows', { mode: 'number' }),

  // Net cash flow
  projected_net_cash_flow: bigint('projected_net_cash_flow', { mode: 'number' }).notNull(),
  projected_ending_cash: bigint('projected_ending_cash', { mode: 'number' }),

  // Working capital
  projected_ar: bigint('projected_ar', { mode: 'number' }),
  projected_ap: bigint('projected_ap', { mode: 'number' }),
  projected_working_capital: bigint('projected_working_capital', { mode: 'number' }),

  // Actual vs projected
  actual_collections: bigint('actual_collections', { mode: 'number' }),
  actual_net_cash_flow: bigint('actual_net_cash_flow', { mode: 'number' }),
  variance_amount: bigint('variance_amount', { mode: 'number' }),
  variance_percentage: bigint('variance_percentage', { mode: 'number' }), // Basis points

  // Confidence and methodology
  confidence_level: varchar('confidence_level', { length: 20 }), // HIGH, MEDIUM, LOW
  confidence_percentage: bigint('confidence_percentage', { mode: 'number' }), // Basis points
  methodology: varchar('methodology', { length: 100 }),
  assumptions: jsonb('assumptions'),

  // Risk factors
  risk_factors: jsonb('risk_factors'), // Array of identified risks
  sensitivity_analysis: jsonb('sensitivity_analysis'), // Best/worst case scenarios

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for performance
  periodIdx: index('idx_cash_flow_projections_period').on(table.projection_for_period),
  dateIdx: index('idx_cash_flow_projections_date').on(table.projection_date),
}));
