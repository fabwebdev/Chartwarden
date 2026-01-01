/**
 * APM (Application Performance Monitoring) API Service
 *
 * Provides API access to performance monitoring data including:
 * - Real-time metrics and dashboard data
 * - Endpoint performance statistics (p50, p95, p99)
 * - Database query monitoring
 * - System resource utilization
 * - Bottleneck detection and alerts
 *
 * HIPAA Note: Only tracks performance metrics, never logs PHI.
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface ResponseTimeStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface EndpointStats {
  requestCount: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  responseTime: ResponseTimeStats;
  payloadSize: ResponseTimeStats;
  lastRequest: number | null;
}

export interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
  error: string | null;
}

export interface DatabaseStats {
  queryCount: number;
  errorCount: number;
  slowQueryCount: number;
  executionTime: ResponseTimeStats;
  recentSlowQueries: SlowQuery[];
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
    errors: number;
    lastUpdate?: number;
  };
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  heapUsedPercent: number;
}

export interface CpuMetrics {
  user: number;
  system: number;
}

export interface SystemMetrics {
  timestamp: number;
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  uptime: number;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface Bottleneck {
  type: 'endpoint' | 'database' | 'connection_pool';
  severity: 'warning' | 'critical';
  route?: string;
  p95?: number;
  requestCount?: number;
  slowQueryPercent?: string;
  slowQueryCount?: number;
  waiting?: number;
  active?: number;
  total?: number;
}

export interface APMAlert {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface APMThresholds {
  api: {
    warning: number;
    critical: number;
  };
  database: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
}

export interface APMDashboard {
  overview: {
    uptime: number;
    totalEndpoints: number;
    totalRequests: number;
  };
  database: DatabaseStats;
  endpoints: {
    top: Array<[string, EndpointStats]>;
    slowest: Array<[string, EndpointStats]>;
    highestErrorRate: Array<[string, EndpointStats]>;
  };
  system: {
    current: SystemMetrics | null;
    history: SystemMetrics[];
  };
  timeSeries: {
    throughput: TimeSeriesPoint[];
    errorRate: TimeSeriesPoint[];
    avgResponseTime: TimeSeriesPoint[];
  };
  alerts: APMAlert[];
  bottlenecks: Bottleneck[];
  thresholds: APMThresholds;
  timestamp: string;
}

export interface RealTimeMetrics {
  throughput: number;
  errorRate: number;
  avgResponseTime: number;
  memory: MemoryMetrics | null;
  connectionPool: DatabaseStats['connectionPool'];
  activeEndpoints: number;
  timestamp: number;
}

export interface APMConfig {
  thresholds: APMThresholds;
  retention: {
    realtimeWindow: number;
    shortTermWindow: number;
    aggregationInterval: number;
    maxDataPoints: number;
  };
}

export interface APMHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  activeEndpoints: number;
  totalRequests: number;
}

// ==============================|| API FUNCTIONS ||============================== //

/**
 * Get comprehensive APM dashboard data
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getAPMDashboard = async (): Promise<APMDashboard> => {
  const response = await http.get('/apm/dashboard');
  return response.data.data;
};

/**
 * Get real-time metrics snapshot (lightweight, for frequent polling)
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getRealTimeMetrics = async (): Promise<RealTimeMetrics> => {
  const response = await http.get('/apm/realtime');
  return response.data.data;
};

/**
 * Get endpoint metrics with sorting and pagination
 * @param sortBy - Sort by requestCount, p95, or errorRate
 * @param limit - Maximum number of results
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getEndpointMetrics = async (
  sortBy: 'requestCount' | 'p95' | 'errorRate' = 'requestCount',
  limit: number = 20
): Promise<{ endpoints: Array<[string, EndpointStats]>; total: number }> => {
  const response = await http.get('/apm/endpoints', {
    params: { sortBy, limit }
  });
  return response.data.data;
};

/**
 * Get database performance metrics
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getDatabaseMetrics = async (): Promise<DatabaseStats> => {
  const response = await http.get('/apm/database');
  return response.data.data;
};

/**
 * Get system resource metrics
 * @param history - Number of historical data points
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getSystemMetrics = async (history: number = 60): Promise<{
  current: SystemMetrics | null;
  history: SystemMetrics[];
}> => {
  const response = await http.get('/apm/system', {
    params: { history }
  });
  return response.data.data;
};

/**
 * Get time-series data for a specific metric
 * @param metric - Metric type (throughput, errorRate, avgResponseTime)
 * @param points - Number of data points
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getTimeSeries = async (
  metric: 'throughput' | 'errorRate' | 'avgResponseTime',
  points: number = 60
): Promise<TimeSeriesPoint[]> => {
  const response = await http.get(`/apm/timeseries/${metric}`, {
    params: { points }
  });
  return response.data.data.timeSeries;
};

/**
 * Get current bottleneck analysis
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getBottlenecks = async (): Promise<{
  bottlenecks: Bottleneck[];
  count: number;
  hasCritical: boolean;
}> => {
  const response = await http.get('/apm/bottlenecks');
  return response.data.data;
};

/**
 * Get recent performance alerts
 * @param limit - Maximum number of alerts
 * @param type - Filter by alert type
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getAlerts = async (
  limit: number = 50,
  type?: string
): Promise<{ alerts: APMAlert[]; total: number }> => {
  const params: Record<string, unknown> = { limit };
  if (type) params.type = type;

  const response = await http.get('/apm/alerts', { params });
  return response.data.data;
};

/**
 * Get APM configuration and thresholds
 * @requires Permission: VIEW_REPORTS or manage_system
 */
export const getAPMConfig = async (): Promise<APMConfig> => {
  const response = await http.get('/apm/config');
  return response.data.data;
};

/**
 * Update APM thresholds
 * @requires Permission: manage_system (admin only)
 */
export const updateThresholds = async (
  thresholds: Partial<APMThresholds>
): Promise<APMConfig> => {
  const response = await http.put('/apm/config/thresholds', thresholds);
  return response.data.data;
};

/**
 * Reset all APM metrics
 * @requires Permission: manage_system (admin only)
 */
export const resetMetrics = async (): Promise<void> => {
  await http.post('/apm/reset');
};

/**
 * Get APM health status (no auth required - for monitoring)
 */
export const getAPMHealth = async (): Promise<APMHealth> => {
  const response = await http.get('/apm/health');
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format milliseconds to human-readable string
 */
export const formatMs = (ms: number): string => {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} \u03BCs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

/**
 * Format uptime to human-readable string
 */
export const formatUptime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

/**
 * Get severity color for bottlenecks/alerts
 */
export const getSeverityColor = (severity: 'warning' | 'critical'): string => {
  return severity === 'critical' ? 'error' : 'warning';
};

/**
 * Calculate health status from metrics
 */
export const calculateHealthStatus = (
  errorRate: number,
  avgResponseTime: number,
  thresholds: APMThresholds
): 'healthy' | 'degraded' | 'critical' => {
  if (errorRate > 10 || avgResponseTime > thresholds.api.critical) {
    return 'critical';
  }
  if (errorRate > 5 || avgResponseTime > thresholds.api.warning) {
    return 'degraded';
  }
  return 'healthy';
};
