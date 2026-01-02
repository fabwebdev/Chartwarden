-- Migration: Cash Flow Projection Engine Schema
-- Comprehensive data model for cash flow forecasting with payment timing and collection forecasts

-- ============================================
-- TABLE 1: EXPENSE CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id BIGSERIAL PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    category_type VARCHAR(50) NOT NULL, -- PAYROLL, VENDOR, RENT, UTILITIES, SUPPLIES, CAPITAL_EXPENDITURE, OTHER
    parent_category_id BIGINT REFERENCES expense_categories(id),
    default_payment_frequency VARCHAR(50), -- WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
    is_fixed_expense BOOLEAN DEFAULT FALSE,
    seasonal_variance_expected BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    description TEXT,
    metadata JSONB,
    created_by_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- TABLE 2: PAYMENT SCHEDULES
-- ============================================
CREATE TABLE IF NOT EXISTS payment_schedules (
    id BIGSERIAL PRIMARY KEY,
    schedule_name VARCHAR(255) NOT NULL,
    schedule_type VARCHAR(50) NOT NULL, -- PAYROLL, RENT, VENDOR, UTILITY, INSURANCE, CAPITAL_EXPENSE, LOAN_PAYMENT, TAX, OTHER
    expense_category_id BIGINT REFERENCES expense_categories(id),
    payee_name VARCHAR(255),
    payee_id VARCHAR(100),
    base_amount BIGINT NOT NULL, -- In cents
    variable_component BIGINT DEFAULT 0,
    estimated_total BIGINT NOT NULL,
    payment_frequency VARCHAR(50) NOT NULL, -- WEEKLY, BIWEEKLY, SEMIMONTHLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME
    payment_day BIGINT,
    payment_week BIGINT,
    next_payment_date DATE NOT NULL,
    last_payment_date DATE,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    is_perpetual BOOLEAN DEFAULT TRUE,
    early_payment_discount_rate BIGINT, -- Basis points
    early_payment_discount_days BIGINT,
    late_payment_penalty_rate BIGINT, -- Basis points
    grace_period_days BIGINT,
    priority_level VARCHAR(20) DEFAULT 'NORMAL' NOT NULL, -- CRITICAL, HIGH, NORMAL, LOW, DEFERRABLE
    can_be_deferred BOOLEAN DEFAULT FALSE,
    max_deferral_days BIGINT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, PAUSED, COMPLETED, CANCELLED
    notes TEXT,
    metadata JSONB,
    created_by_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_type ON payment_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_next_payment ON payment_schedules(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_priority ON payment_schedules(priority_level);

-- ============================================
-- TABLE 3: RECURRING REVENUE STREAMS
-- ============================================
CREATE TABLE IF NOT EXISTS recurring_revenue_streams (
    id BIGSERIAL PRIMARY KEY,
    stream_name VARCHAR(255) NOT NULL,
    stream_type VARCHAR(50) NOT NULL, -- PATIENT_SERVICE, CONTRACT, SUBSCRIPTION, GRANT, OTHER
    payer_id BIGINT REFERENCES payers(id),
    customer_segment VARCHAR(100), -- MEDICARE, MEDICAID, COMMERCIAL, PRIVATE_PAY
    expected_monthly_revenue BIGINT NOT NULL, -- In cents
    minimum_revenue BIGINT,
    maximum_revenue BIGINT,
    payment_cycle VARCHAR(50) NOT NULL, -- WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY
    expected_collection_day BIGINT,
    average_days_to_collection BIGINT,
    base_collection_rate BIGINT DEFAULT 10000, -- Basis points (100%)
    historical_collection_rate BIGINT,
    effective_start_date DATE NOT NULL,
    effective_end_date DATE,
    seasonal_adjustment_factors JSONB, -- { jan: 1.0, feb: 0.95, ... }
    is_seasonal BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL, -- ACTIVE, PAUSED, ENDED
    notes TEXT,
    metadata JSONB,
    created_by_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_revenue_type ON recurring_revenue_streams(stream_type);
CREATE INDEX IF NOT EXISTS idx_recurring_revenue_segment ON recurring_revenue_streams(customer_segment);

-- ============================================
-- TABLE 4: HISTORICAL COLLECTION PATTERNS
-- ============================================
CREATE TABLE IF NOT EXISTS historical_collection_patterns (
    id BIGSERIAL PRIMARY KEY,
    pattern_period VARCHAR(7) NOT NULL, -- YYYY-MM
    pattern_type VARCHAR(50) NOT NULL, -- PAYER, SEGMENT, OVERALL
    payer_id BIGINT REFERENCES payers(id),
    customer_segment VARCHAR(100),
    total_invoiced_count BIGINT DEFAULT 0,
    total_collected_count BIGINT DEFAULT 0,
    total_invoiced_amount BIGINT DEFAULT 0, -- In cents
    total_collected_amount BIGINT DEFAULT 0,
    total_written_off_amount BIGINT DEFAULT 0,
    collection_rate BIGINT, -- Basis points
    write_off_rate BIGINT,
    avg_days_to_collection DECIMAL(10,2),
    median_days_to_collection BIGINT,
    std_dev_days_to_collection DECIMAL(10,2),
    pct_current BIGINT, -- 0-30 days
    pct_31_60 BIGINT,
    pct_61_90 BIGINT,
    pct_91_120 BIGINT,
    pct_over_120 BIGINT,
    collection_prob_current BIGINT, -- Basis points
    collection_prob_31_60 BIGINT,
    collection_prob_61_90 BIGINT,
    collection_prob_91_120 BIGINT,
    collection_prob_over_120 BIGINT,
    is_peak_month BOOLEAN DEFAULT FALSE,
    is_slow_month BOOLEAN DEFAULT FALSE,
    seasonal_factor DECIMAL(5,3),
    data_completeness BIGINT, -- Basis points
    sample_size BIGINT,
    calculation_date TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historical_collection_period ON historical_collection_patterns(pattern_period);
CREATE INDEX IF NOT EXISTS idx_historical_collection_payer ON historical_collection_patterns(payer_id);
CREATE INDEX IF NOT EXISTS idx_historical_collection_segment ON historical_collection_patterns(customer_segment);

-- ============================================
-- TABLE 5: CASH FLOW SCENARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS cash_flow_scenarios (
    id BIGSERIAL PRIMARY KEY,
    scenario_name VARCHAR(255) NOT NULL,
    scenario_type VARCHAR(50) NOT NULL, -- BASE, OPTIMISTIC, PESSIMISTIC, CUSTOM, STRESS_TEST
    description TEXT,
    collection_rate_adjustment BIGINT DEFAULT 0, -- Basis points
    days_to_collection_adjustment BIGINT DEFAULT 0,
    write_off_rate_adjustment BIGINT DEFAULT 0,
    revenue_growth_rate BIGINT DEFAULT 0,
    seasonal_variance_factor DECIMAL(5,3) DEFAULT 1.0,
    expense_inflation_rate BIGINT DEFAULT 0,
    payroll_growth_rate BIGINT DEFAULT 0,
    vendor_cost_adjustment BIGINT DEFAULT 0,
    early_payment_utilization BIGINT,
    late_payment_probability BIGINT,
    collection_risk_factor DECIMAL(5,3) DEFAULT 1.0,
    expense_risk_factor DECIMAL(5,3) DEFAULT 1.0,
    currency_code VARCHAR(3) DEFAULT 'USD',
    exchange_rate_assumption DECIMAL(10,4),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    notes TEXT,
    metadata JSONB,
    created_by_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cf_scenarios_type ON cash_flow_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_cf_scenarios_default ON cash_flow_scenarios(is_default);

-- ============================================
-- TABLE 6: CASH FLOW FORECAST PERIODS
-- ============================================
CREATE TABLE IF NOT EXISTS cash_flow_forecast_periods (
    id BIGSERIAL PRIMARY KEY,
    forecast_date DATE NOT NULL,
    forecast_period_start DATE NOT NULL,
    forecast_period_end DATE NOT NULL,
    period_label VARCHAR(50) NOT NULL, -- "Week 1", "2025-01", "Q1-2025"
    period_type VARCHAR(50) NOT NULL, -- WEEKLY, MONTHLY, QUARTERLY, ANNUAL
    horizon_days BIGINT NOT NULL,
    forecast_horizon VARCHAR(50) NOT NULL, -- 30_DAY, 60_DAY, 90_DAY, QUARTERLY, ANNUAL
    scenario_id BIGINT REFERENCES cash_flow_scenarios(id),
    scenario_type VARCHAR(50) DEFAULT 'BASE',
    opening_cash_balance BIGINT,
    projected_collections BIGINT NOT NULL, -- In cents
    projected_appeal_recoveries BIGINT DEFAULT 0,
    projected_recurring_revenue BIGINT DEFAULT 0,
    projected_other_income BIGINT DEFAULT 0,
    total_projected_inflows BIGINT NOT NULL,
    projected_payroll BIGINT DEFAULT 0,
    projected_rent BIGINT DEFAULT 0,
    projected_vendor_payments BIGINT DEFAULT 0,
    projected_utilities BIGINT DEFAULT 0,
    projected_capital_expenditure BIGINT DEFAULT 0,
    projected_loan_payments BIGINT DEFAULT 0,
    projected_taxes BIGINT DEFAULT 0,
    projected_other_expenses BIGINT DEFAULT 0,
    total_projected_outflows BIGINT NOT NULL,
    projected_net_cash_flow BIGINT NOT NULL,
    projected_ending_cash BIGINT,
    minimum_cash_balance BIGINT,
    minimum_cash_date DATE,
    peak_funding_requirement BIGINT,
    days_cash_on_hand DECIMAL(10,2),
    actual_collections BIGINT,
    actual_outflows BIGINT,
    actual_net_cash_flow BIGINT,
    actual_ending_cash BIGINT,
    variance_collections BIGINT,
    variance_collections_pct BIGINT, -- Basis points
    variance_outflows BIGINT,
    variance_outflows_pct BIGINT,
    variance_net_cash_flow BIGINT,
    variance_net_cash_flow_pct BIGINT,
    confidence_level VARCHAR(20), -- HIGH, MEDIUM, LOW
    confidence_percentage BIGINT, -- Basis points
    methodology VARCHAR(100),
    data_sources JSONB,
    assumptions JSONB,
    collection_rate_assumption BIGINT,
    late_payment_adjustment BIGINT,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP,
    locked_by_id TEXT REFERENCES "user"(id),
    notes TEXT,
    metadata JSONB,
    created_by_id TEXT REFERENCES "user"(id),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cf_forecast_period ON cash_flow_forecast_periods(period_label);
CREATE INDEX IF NOT EXISTS idx_cf_forecast_horizon ON cash_flow_forecast_periods(forecast_horizon);
CREATE INDEX IF NOT EXISTS idx_cf_forecast_date ON cash_flow_forecast_periods(forecast_date);
CREATE INDEX IF NOT EXISTS idx_cf_forecast_scenario ON cash_flow_forecast_periods(scenario_id);

-- ============================================
-- TABLE 7: CASH FLOW AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS cash_flow_audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL, -- SCENARIO, FORECAST, PAYMENT_SCHEDULE, REVENUE_STREAM
    entity_id BIGINT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOCK, UNLOCK
    field_changed VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,
    context JSONB,
    changed_by_id TEXT REFERENCES "user"(id) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_cf_audit_entity ON cash_flow_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cf_audit_user ON cash_flow_audit_log(changed_by_id);
CREATE INDEX IF NOT EXISTS idx_cf_audit_date ON cash_flow_audit_log(changed_at);

-- ============================================
-- TABLE 8: AR RECEIVABLES SNAPSHOT
-- ============================================
CREATE TABLE IF NOT EXISTS ar_receivables_snapshot (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) DEFAULT 'DAILY' NOT NULL,
    payer_id BIGINT REFERENCES payers(id),
    customer_segment VARCHAR(100),
    total_outstanding BIGINT NOT NULL, -- In cents
    ar_current BIGINT DEFAULT 0,
    ar_31_60 BIGINT DEFAULT 0,
    ar_61_90 BIGINT DEFAULT 0,
    ar_91_120 BIGINT DEFAULT 0,
    ar_over_120 BIGINT DEFAULT 0,
    projected_collection_7_days BIGINT,
    projected_collection_14_days BIGINT,
    projected_collection_30_days BIGINT,
    projected_collection_60_days BIGINT,
    projected_collection_90_days BIGINT,
    days_sales_outstanding DECIMAL(10,2),
    invoice_count BIGINT,
    claim_count BIGINT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ar_snapshot_date ON ar_receivables_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ar_snapshot_payer ON ar_receivables_snapshot(payer_id);

-- ============================================
-- TABLE 9: AP PAYABLES SNAPSHOT
-- ============================================
CREATE TABLE IF NOT EXISTS ap_payables_snapshot (
    id BIGSERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) DEFAULT 'DAILY' NOT NULL,
    expense_category_id BIGINT REFERENCES expense_categories(id),
    vendor_id VARCHAR(100),
    vendor_name VARCHAR(255),
    total_outstanding BIGINT NOT NULL, -- In cents
    ap_current BIGINT DEFAULT 0,
    ap_due_7_days BIGINT DEFAULT 0,
    ap_due_14_days BIGINT DEFAULT 0,
    ap_due_30_days BIGINT DEFAULT 0,
    ap_overdue BIGINT DEFAULT 0,
    expected_payment_7_days BIGINT,
    expected_payment_14_days BIGINT,
    expected_payment_30_days BIGINT,
    expected_payment_60_days BIGINT,
    expected_payment_90_days BIGINT,
    early_discount_available BIGINT,
    early_discount_deadline DATE,
    invoice_count BIGINT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ap_snapshot_date ON ap_payables_snapshot(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ap_snapshot_category ON ap_payables_snapshot(expense_category_id);
