/**
 * Revenue Recognition API Service
 *
 * Comprehensive API service for revenue recognition, forecasting,
 * cash flow projections, and financial analytics.
 *
 * Features:
 *   - Revenue accrual tracking
 *   - Multi-model forecasting (census, LOC, historical, comprehensive)
 *   - Cash flow projections with scenario analysis
 *   - Payer pattern analysis
 *   - Forecast accuracy reporting
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export type AdjustmentType =
  | 'CONTRACTUAL'
  | 'WRITE_OFF'
  | 'BAD_DEBT'
  | 'DENIAL'
  | 'CORRECTION'
  | 'APPEAL_RECOVERY';

export type RecognitionStatus =
  | 'PENDING'
  | 'BILLED'
  | 'COLLECTED'
  | 'WRITTEN_OFF'
  | 'DISPUTED';

export type ForecastModel =
  | 'census'
  | 'loc'
  | 'historical'
  | 'comprehensive'
  | 'scenario';

export type ScenarioType = 'optimistic' | 'base' | 'pessimistic';

export type LevelOfCare = 'RHC' | 'CHC' | 'GIP' | 'IRC';

// Revenue Accrual Interface
export interface RevenueAccrual {
  id: number;
  period_start_date: string;
  period_end_date: string;
  patient_id: number;
  payer_id: number;
  level_of_care: LevelOfCare;
  service_days: number;
  billed_amount: number;
  expected_collection: number;
  actual_collection: number;
  contractual_adjustment: number;
  write_off_amount: number;
  bad_debt_amount: number;
  denial_amount: number;
  recognized_revenue: number;
  recognition_status: RecognitionStatus;
  claim_id?: number;
  billing_date?: string;
  collection_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Revenue Adjustment Interface
export interface RevenueAdjustment {
  id: number;
  accrual_id: number;
  adjustment_type: AdjustmentType;
  adjustment_amount: number;
  adjustment_reason?: string;
  adjustment_date: string;
  created_by_id?: string;
  created_at: string;
}

// Forecast Period Interface
export interface ForecastPeriod {
  period_label: string;
  period_start: string;
  period_end: string;
  forecasted_revenue: number;
  forecasted_collections: number;
  confidence_level?: string;
  model_used: string;
  components?: {
    rhc?: number;
    chc?: number;
    gip?: number;
    irc?: number;
  };
}

// Collection Forecast Response
export interface CollectionForecastResponse {
  forecast_model: ForecastModel;
  generated_at: string;
  parameters: Record<string, any>;
  periods: ForecastPeriod[];
  total_forecasted_revenue: number;
  total_forecasted_collections: number;
  confidence_metrics?: {
    coefficient_of_variation: number;
    confidence_level: string;
    prediction_interval?: {
      lower: number;
      upper: number;
    };
  };
}

// Scenario Forecast Response
export interface ScenarioForecastResponse {
  scenarios: {
    optimistic: ForecastPeriod[];
    base: ForecastPeriod[];
    pessimistic: ForecastPeriod[];
  };
  generated_at: string;
  assumptions: {
    optimistic: Record<string, any>;
    base: Record<string, any>;
    pessimistic: Record<string, any>;
  };
}

// Cash Flow Projection Interfaces
export interface CashFlowProjection {
  id: number;
  projection_name: string;
  start_date: string;
  end_date: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CashFlowPeriod {
  period_label: string;
  period_start: string;
  period_end: string;
  cash_inflows: number;
  cash_outflows: number;
  net_cash_flow: number;
  cumulative_cash: number;
  scenario_type?: ScenarioType;
}

export interface CashFlowProjectionDetail extends CashFlowProjection {
  periods: CashFlowPeriod[];
  expense_categories: ExpenseCategory[];
  payment_schedules: PaymentSchedule[];
  recurring_revenue: RecurringRevenue[];
}

export interface ExpenseCategory {
  id: number;
  projection_id: number;
  category_name: string;
  monthly_amount: number;
  is_fixed: boolean;
  notes?: string;
}

export interface PaymentSchedule {
  id: number;
  projection_id: number;
  description: string;
  payment_date: string;
  amount: number;
  payment_type: 'EXPENSE' | 'REVENUE';
}

export interface RecurringRevenue {
  id: number;
  projection_id: number;
  description: string;
  monthly_amount: number;
  start_date: string;
  end_date?: string;
}

// Scenario Comparison Interface
export interface ScenarioComparison {
  projection_id: number;
  scenarios: {
    optimistic: CashFlowPeriod[];
    base: CashFlowPeriod[];
    pessimistic: CashFlowPeriod[];
  };
  comparison_summary: {
    best_case_ending_cash: number;
    expected_ending_cash: number;
    worst_case_ending_cash: number;
    cash_at_risk: number;
    runway_months?: number;
  };
}

// Payer Pattern Interface
export interface PayerPattern {
  payer_id: number;
  payer_name: string;
  avg_days_to_pay: number;
  collection_rate: number;
  denial_rate: number;
  appeal_success_rate: number;
  total_billed: number;
  total_collected: number;
  claim_count: number;
  reliability_score: number;
  payment_behavior: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
}

// Dashboard KPIs
export interface RevenueDashboardKPIs {
  period: {
    label: string;
    start: string;
    end: string;
  };
  accruals: {
    total_accrued: number;
    total_accrued_formatted: string;
    total_recognized: number;
    total_recognized_formatted: string;
    total_billed: number;
    total_billed_formatted: string;
    total_collected: number;
    total_collected_formatted: string;
    total_outstanding: number;
    total_outstanding_formatted: string;
  };
  metrics: {
    collection_rate: number;
    recognition_rate: number;
    avg_days_to_collect: number;
    write_off_rate: number;
    denial_rate: number;
  };
  by_loc: Array<{
    level_of_care: LevelOfCare;
    total_days: number;
    total_billed: number;
    total_collected: number;
    avg_daily_rate: number;
  }>;
  trends: {
    revenue_trend: 'increasing' | 'decreasing' | 'stable';
    revenue_change_percent: number;
    collection_trend: 'increasing' | 'decreasing' | 'stable';
    collection_change_percent: number;
  };
}

// Accrual Timeline Data Point
export interface AccrualTimelinePoint {
  date: string;
  accrued_amount: number;
  recognized_amount: number;
  collected_amount: number;
  outstanding_amount: number;
}

// ==============================|| ACCRUAL ENDPOINTS ||============================== //

/**
 * Get all revenue accruals with filters
 */
export const getRevenueAccruals = async (params?: {
  start_date?: string;
  end_date?: string;
  patient_id?: number;
  payer_id?: number;
  status?: RecognitionStatus;
  level_of_care?: LevelOfCare;
  limit?: number;
  offset?: number;
}): Promise<{ data: RevenueAccrual[]; total: number }> => {
  const response = await http.get('/revenue/accruals', { params });
  return response.data.data || response.data;
};

/**
 * Get revenue accrual by ID
 */
export const getRevenueAccrualById = async (id: number): Promise<{
  accrual: RevenueAccrual;
  adjustments: RevenueAdjustment[];
}> => {
  const response = await http.get(`/revenue/accruals/${id}`);
  return response.data.data || response.data;
};

/**
 * Get accrual timeline for charts
 */
export const getAccrualTimeline = async (params: {
  start_date: string;
  end_date: string;
  level_of_care?: LevelOfCare;
  payer_id?: number;
}): Promise<AccrualTimelinePoint[]> => {
  const response = await http.get('/revenue/accruals/timeline', { params });
  return response.data.data || response.data;
};

/**
 * Get accrual vs actual reconciliation
 */
export const getAccrualReconciliation = async (params: {
  period_start: string;
  period_end: string;
}): Promise<{
  period: { start: string; end: string };
  total_accrued: number;
  total_billed: number;
  total_collected: number;
  variance: number;
  variance_percentage: number;
  discrepancies: Array<{
    patient_id: number;
    patient_name: string;
    accrued: number;
    billed: number;
    difference: number;
    reason?: string;
  }>;
}> => {
  const response = await http.get('/revenue/accruals/reconciliation', { params });
  return response.data.data || response.data;
};

// ==============================|| FORECASTING ENDPOINTS ||============================== //

/**
 * Generate collection forecast using specified model
 */
export const generateCollectionForecast = async (params: {
  model: ForecastModel;
  months_ahead?: number;
  include_confidence?: boolean;
}): Promise<CollectionForecastResponse> => {
  const response = await http.post('/revenue/forecast/collection', params);
  return response.data.data || response.data;
};

/**
 * Generate scenario-based forecast
 */
export const generateScenarioForecast = async (params: {
  months_ahead?: number;
}): Promise<ScenarioForecastResponse> => {
  const response = await http.post('/revenue/forecast/scenarios', params);
  return response.data.data || response.data;
};

/**
 * Get forecast accuracy report
 */
export const getForecastAccuracy = async (params: {
  start_date: string;
  end_date: string;
}): Promise<{
  period: { start: string; end: string };
  by_model: Array<{
    model: ForecastModel;
    avg_error_percentage: number;
    rmse: number;
    mae: number;
    accuracy_score: number;
  }>;
  overall_accuracy: number;
}> => {
  const response = await http.get('/revenue/forecast/accuracy', { params });
  return response.data.data || response.data;
};

// ==============================|| CASH FLOW ENDPOINTS ||============================== //

/**
 * Get all cash flow projections
 */
export const getCashFlowProjections = async (): Promise<CashFlowProjection[]> => {
  const response = await http.get('/revenue/cash-flow/projections');
  return response.data.data || response.data;
};

/**
 * Get cash flow projection detail by ID
 */
export const getCashFlowProjectionById = async (id: number): Promise<CashFlowProjectionDetail> => {
  const response = await http.get(`/revenue/cash-flow/projections/${id}`);
  return response.data.data || response.data;
};

/**
 * Create new cash flow projection
 */
export const createCashFlowProjection = async (data: {
  projection_name: string;
  start_date: string;
  end_date: string;
}): Promise<CashFlowProjection> => {
  const response = await http.post('/revenue/cash-flow/projections', data);
  return response.data.data || response.data;
};

/**
 * Get scenario comparison for cash flow projection
 */
export const getCashFlowScenarios = async (projectionId: number): Promise<ScenarioComparison> => {
  const response = await http.get(`/revenue/cash-flow/projections/${projectionId}/scenarios`);
  return response.data.data || response.data;
};

/**
 * Calculate runway and burn rate
 */
export const getRunwayMetrics = async (projectionId: number): Promise<{
  current_cash: number;
  monthly_burn_rate: number;
  runway_months: number;
  cash_depletion_date?: string;
  critical_milestones: Array<{
    date: string;
    description: string;
    cash_position: number;
    is_critical: boolean;
  }>;
}> => {
  const response = await http.get(`/revenue/cash-flow/projections/${projectionId}/runway`);
  return response.data.data || response.data;
};

// ==============================|| PAYER ANALYSIS ENDPOINTS ||============================== //

/**
 * Get payer payment patterns and analysis
 */
export const getPayerPatterns = async (): Promise<PayerPattern[]> => {
  const response = await http.get('/revenue/analysis/payer-patterns');
  return response.data.data || response.data;
};

/**
 * Get specific payer analysis
 */
export const getPayerAnalysis = async (payerId: number): Promise<{
  payer: PayerPattern;
  payment_timeline: Array<{
    month: string;
    claims_submitted: number;
    claims_paid: number;
    avg_days_to_pay: number;
    collection_rate: number;
  }>;
  denial_reasons: Array<{
    reason: string;
    count: number;
    total_amount: number;
  }>;
}> => {
  const response = await http.get(`/revenue/analysis/payers/${payerId}`);
  return response.data.data || response.data;
};

// ==============================|| DASHBOARD ENDPOINTS ||============================== //

/**
 * Get comprehensive revenue dashboard
 */
export const getRevenueDashboard = async (params?: {
  period?: string;
  start_date?: string;
  end_date?: string;
}): Promise<RevenueDashboardKPIs> => {
  const response = await http.get('/revenue/dashboard', { params });
  return response.data.data || response.data;
};

// ==============================|| EXPORT ENDPOINTS ||============================== //

/**
 * Export revenue data to CSV
 */
export const exportRevenueToCSV = async (params?: {
  start_date?: string;
  end_date?: string;
  level_of_care?: LevelOfCare;
}): Promise<Blob> => {
  const response = await http.get('/revenue/export/csv', {
    params,
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Export forecast to CSV
 */
export const exportForecastToCSV = async (model: ForecastModel, months_ahead?: number): Promise<Blob> => {
  const response = await http.get('/revenue/forecast/export/csv', {
    params: { model, months_ahead },
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Export cash flow projection to CSV
 */
export const exportCashFlowToCSV = async (projectionId: number): Promise<Blob> => {
  const response = await http.get(`/revenue/cash-flow/projections/${projectionId}/export/csv`, {
    responseType: 'blob'
  });
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format currency from cents to dollars
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

/**
 * Get LOC display name
 */
export const getLOCDisplayName = (loc: LevelOfCare): string => {
  const names: Record<LevelOfCare, string> = {
    RHC: 'Routine Home Care',
    CHC: 'Continuous Home Care',
    GIP: 'General Inpatient Care',
    IRC: 'Inpatient Respite Care'
  };
  return names[loc] || loc;
};

/**
 * Get status color for recognition status
 */
export const getRecognitionStatusColor = (
  status: RecognitionStatus
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colors: Record<RecognitionStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    PENDING: 'warning',
    BILLED: 'info',
    COLLECTED: 'success',
    WRITTEN_OFF: 'error',
    DISPUTED: 'error'
  };
  return colors[status] || 'default';
};

/**
 * Get payer behavior color
 */
export const getPayerBehaviorColor = (
  behavior: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
): 'success' | 'primary' | 'warning' | 'error' => {
  const colors = {
    EXCELLENT: 'success' as const,
    GOOD: 'primary' as const,
    FAIR: 'warning' as const,
    POOR: 'error' as const
  };
  return colors[behavior] || 'default' as any;
};

/**
 * Calculate trend direction
 */
export const getTrendDirection = (changePercent: number): 'increasing' | 'decreasing' | 'stable' => {
  if (changePercent > 2) return 'increasing';
  if (changePercent < -2) return 'decreasing';
  return 'stable';
};

/**
 * Format scenario type for display
 */
export const formatScenarioType = (scenario: ScenarioType): string => {
  const labels: Record<ScenarioType, string> = {
    optimistic: 'Best Case',
    base: 'Expected',
    pessimistic: 'Worst Case'
  };
  return labels[scenario] || scenario;
};
