/**
 * Analytics API Service
 *
 * Comprehensive API service for analytics, metrics, and dashboard endpoints.
 * Provides access to the Metrics Engine for advanced analytics capabilities.
 *
 * Features:
 *   - Comprehensive metrics with statistical analysis
 *   - Time-series data with trend detection
 *   - Revenue and claims forecasting
 *   - Executive, financial, and clinical dashboards
 *   - Period comparison analysis
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface PeriodOption {
  value: string;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_quarter', label: 'Current Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' }
];

export type MetricType = 'revenue' | 'claims' | 'collections' | 'encounters';
export type TimeInterval = 'day' | 'week' | 'month' | 'quarter';

export interface KPI {
  id: string;
  label: string;
  value: number;
  formatted: string;
  trend?: {
    direction: 'positive' | 'negative' | 'neutral';
    percentage: number;
    raw_change?: number;
  };
  status?: 'excellent' | 'on_target' | 'warning' | 'critical';
  target?: number;
  type: 'currency' | 'percentage' | 'days' | 'count';
}

export interface TrendData {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number;
  confidence: number;
  projectedChange: number;
}

export interface TimeSeriesDataPoint {
  period: string;
  value: number;
  value_formatted?: string;
  moving_avg?: number | null;
  ema?: number | null;
}

export interface TimeSeriesResponse {
  metric_type: string;
  period: DateRange;
  interval: TimeInterval;
  data_points: TimeSeriesDataPoint[];
  statistics: {
    count: number;
    sum: number;
    mean: number;
    std_dev: number;
    min: number;
    max: number;
    p25: number;
    p50: number;
    p75: number;
  };
  trend: TrendData;
}

export interface ForecastPeriod {
  period: number;
  sma: number;
  exponential_smoothing: number;
  linear_trend: number;
  ensemble: number;
}

export interface ForecastResponse {
  metric_type: string;
  forecast_date: string;
  periods_ahead: number;
  historical_periods: number;
  forecasts: ForecastPeriod[];
  confidence_interval: {
    standard_deviation: number;
    confidence_95_lower: number;
    confidence_95_upper: number;
    confidence_level: 'high' | 'medium' | 'low';
  };
  methodology: string;
}

export interface DashboardAlert {
  type: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  action?: string;
}

export interface ExecutiveDashboard {
  period: {
    label: string;
    start: string;
    end: string;
  };
  kpis: KPI[];
  financial: {
    total_claims: number;
    total_charges: number;
    total_charges_formatted: string;
    total_payments: number;
    total_payments_formatted: string;
    clean_claim_rate: number;
    denial_rate: number;
    net_collection_rate: number;
    avg_days_to_payment: number;
    ar_aging: {
      current: number;
      aging_31_60: number;
      aging_61_90: number;
      aging_over_90: number;
      total: number;
    };
  };
  clinical: {
    active_patients: number;
    total_encounters: number;
    completed_encounters: number;
    avg_encounter_duration: string;
    encounter_completion_rate: number;
    by_discipline?: Array<{
      discipline: string;
      count: number;
    }>;
  };
  operational: {
    claims_by_status: Array<{
      status: string;
      count: number;
      total_charges: number;
      total_charges_formatted: string;
    }>;
    claims_by_payer: Array<{
      payer_id: number;
      payer_name: string;
      claim_count: number;
      total_charges: number;
      collection_rate: number;
    }>;
  };
  compliance: {
    total_claims_audited: number;
    scrubbing_pass_rate: number;
    scrubbing_fail_rate: number;
    pending_audit: number;
    compliance_score: number;
  };
  alerts: DashboardAlert[];
  generated_at: string;
}

// ==============================|| COMPREHENSIVE METRICS ||============================== //

/**
 * Get comprehensive metrics for a date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @requires Permission: VIEW_REPORTS
 */
export const getComprehensiveMetrics = async (startDate: string, endDate: string) => {
  const response = await http.get('/metrics/comprehensive', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

// ==============================|| TIME-SERIES ANALYSIS ||============================== //

/**
 * Get time-series data with trend analysis
 * @param type - Metric type (revenue, claims, collections, encounters)
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param interval - Time interval (day, week, month, quarter)
 * @requires Permission: VIEW_REPORTS
 */
export const getTimeSeries = async (
  type: MetricType,
  startDate: string,
  endDate: string,
  interval: TimeInterval = 'month'
): Promise<TimeSeriesResponse> => {
  const response = await http.get(`/metrics/time-series/${type}`, {
    params: {
      start_date: startDate,
      end_date: endDate,
      interval
    }
  });
  return response.data.data;
};

/**
 * Get revenue time-series
 */
export const getRevenueTimeSeries = async (
  startDate: string,
  endDate: string,
  interval: TimeInterval = 'month'
) => {
  return getTimeSeries('revenue', startDate, endDate, interval);
};

/**
 * Get claims time-series
 */
export const getClaimsTimeSeries = async (
  startDate: string,
  endDate: string,
  interval: TimeInterval = 'month'
) => {
  return getTimeSeries('claims', startDate, endDate, interval);
};

/**
 * Get collections time-series
 */
export const getCollectionsTimeSeries = async (
  startDate: string,
  endDate: string,
  interval: TimeInterval = 'month'
) => {
  return getTimeSeries('collections', startDate, endDate, interval);
};

/**
 * Get encounters time-series
 */
export const getEncountersTimeSeries = async (
  startDate: string,
  endDate: string,
  interval: TimeInterval = 'month'
) => {
  return getTimeSeries('encounters', startDate, endDate, interval);
};

// ==============================|| FORECASTING ||============================== //

/**
 * Get metric forecast using ensemble methods
 * @param type - Metric type (revenue, claims, collections, encounters)
 * @param periodsAhead - Number of periods to forecast (1-12)
 * @requires Permission: VIEW_REPORTS
 */
export const getForecast = async (
  type: MetricType,
  periodsAhead: number = 3
): Promise<ForecastResponse> => {
  const response = await http.get(`/metrics/forecast/${type}`, {
    params: { periods_ahead: periodsAhead }
  });
  return response.data.data;
};

/**
 * Get revenue forecast
 */
export const getRevenueForecast = async (periodsAhead: number = 3) => {
  return getForecast('revenue', periodsAhead);
};

/**
 * Get claims forecast
 */
export const getClaimsForecast = async (periodsAhead: number = 3) => {
  return getForecast('claims', periodsAhead);
};

// ==============================|| STATISTICAL ANALYSIS ||============================== //

/**
 * Get detailed statistical analysis for a metric
 * @param type - Metric type (revenue, claims, collections, encounters)
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @requires Permission: VIEW_REPORTS
 */
export const getStatistics = async (
  type: MetricType,
  startDate: string,
  endDate: string
) => {
  const response = await http.get(`/metrics/statistics/${type}`, {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data.data;
};

// ==============================|| PERIOD COMPARISON ||============================== //

/**
 * Compare metrics between two periods
 * @param currentStart - Current period start date
 * @param currentEnd - Current period end date
 * @param previousStart - Previous period start date
 * @param previousEnd - Previous period end date
 * @requires Permission: VIEW_REPORTS
 */
export const comparePeriods = async (
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
) => {
  const response = await http.get('/metrics/compare', {
    params: {
      current_start: currentStart,
      current_end: currentEnd,
      previous_start: previousStart,
      previous_end: previousEnd
    }
  });
  return response.data.data;
};

// ==============================|| DASHBOARDS ||============================== //

/**
 * Get executive dashboard with all KPIs and summaries
 * @param period - Dashboard period (current_month, last_month, etc.)
 * @param includeComparison - Include previous period comparison
 * @requires Permission: VIEW_REPORTS
 */
export const getExecutiveDashboard = async (
  period: string = 'current_month',
  includeComparison: boolean = true
): Promise<ExecutiveDashboard> => {
  const response = await http.get('/dashboards/executive', {
    params: {
      period,
      include_comparison: includeComparison.toString()
    }
  });
  return response.data.data;
};

/**
 * Get financial dashboard with revenue cycle metrics
 * @param period - Dashboard period
 * @requires Permission: VIEW_REPORTS
 */
export const getFinancialDashboard = async (period: string = 'current_month') => {
  const response = await http.get('/dashboards/financial', {
    params: { period }
  });
  return response.data.data;
};

/**
 * Get clinical dashboard with patient care metrics
 * @param period - Dashboard period
 * @requires Permission: VIEW_REPORTS
 */
export const getClinicalDashboard = async (period: string = 'current_month') => {
  const response = await http.get('/dashboards/clinical', {
    params: { period }
  });
  return response.data.data;
};

// ==============================|| EXISTING ANALYTICS (BACKWARD COMPATIBILITY) ||============================== //

/**
 * Get KPI dashboard (existing analytics endpoint)
 * @param period - Period (current_month, last_month, current_quarter, ytd)
 */
export const getKPIDashboard = async (period: string = 'current_month') => {
  const response = await http.get('/analytics/kpi-dashboard', {
    params: { period }
  });
  return response.data;
};

/**
 * Get clean claim rate time-series
 */
export const getCleanClaimRate = async (
  startDate: string,
  endDate: string,
  groupBy: string = 'month'
) => {
  const response = await http.get('/analytics/clean-claim-rate', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy }
  });
  return response.data;
};

/**
 * Get days to payment trend
 */
export const getDaysToPayment = async (
  startDate: string,
  endDate: string,
  groupBy: string = 'month'
) => {
  const response = await http.get('/analytics/days-to-payment', {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy }
  });
  return response.data;
};

/**
 * Get denial rate by payer
 */
export const getDenialRateByPayer = async (startDate: string, endDate?: string) => {
  const response = await http.get('/analytics/denial-rate-by-payer', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

/**
 * Get net collection rate with trend
 */
export const getNetCollectionRate = async (startDate: string, endDate: string) => {
  const response = await http.get('/analytics/net-collection-rate', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

/**
 * Get revenue forecast (legacy endpoint)
 */
export const getRevenueForecastLegacy = async (horizonDays: number = 90) => {
  const response = await http.get('/analytics/revenue-forecast', {
    params: { horizon_days: horizonDays }
  });
  return response.data;
};

/**
 * Get AR aging trend
 */
export const getARAgingTrend = async (startDate: string, endDate?: string) => {
  const response = await http.get('/analytics/ar-aging-trend', {
    params: { start_date: startDate, end_date: endDate }
  });
  return response.data;
};

/**
 * Export analytics report
 */
export const exportReport = async (
  reportType: string,
  format: 'csv' | 'excel' = 'csv',
  startDate?: string,
  endDate?: string
) => {
  const response = await http.post('/analytics/export-report', {
    report_type: reportType,
    format,
    start_date: startDate,
    end_date: endDate
  }, {
    responseType: 'blob'
  });
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format currency value (cents to dollars)
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get date range for a period
 */
export const getDateRangeForPeriod = (period: string): DateRange => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'current_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setDate(0);
      break;
    case 'current_quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start.setMonth(quarter * 3);
      start.setDate(1);
      break;
    case 'ytd':
      start.setMonth(0);
      start.setDate(1);
      break;
    case 'last_30_days':
      start.setDate(now.getDate() - 30);
      break;
    case 'last_90_days':
      start.setDate(now.getDate() - 90);
      break;
    default:
      start.setDate(1);
  }

  return {
    start_date: start.toISOString().split('T')[0],
    end_date: end.toISOString().split('T')[0]
  };
};

/**
 * Get trend indicator (up, down, neutral) based on percentage change
 */
export const getTrendIndicator = (
  percentage: number,
  lowerIsBetter: boolean = false
): 'up' | 'down' | 'neutral' => {
  if (Math.abs(percentage) < 1) return 'neutral';
  if (lowerIsBetter) {
    return percentage < 0 ? 'up' : 'down';
  }
  return percentage > 0 ? 'up' : 'down';
};

/**
 * Get status color based on metric evaluation
 */
export const getStatusColor = (
  status: 'excellent' | 'on_target' | 'warning' | 'critical' | undefined
): string => {
  switch (status) {
    case 'excellent':
      return 'success';
    case 'on_target':
      return 'primary';
    case 'warning':
      return 'warning';
    case 'critical':
      return 'error';
    default:
      return 'default';
  }
};
