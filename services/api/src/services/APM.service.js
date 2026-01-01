/**
 * Application Performance Monitoring (APM) Service
 *
 * Comprehensive APM implementation for Chartwarden EHR
 * Features:
 * - Database query monitoring with execution time tracking
 * - API endpoint performance (p50, p95, p99 percentiles)
 * - Request throughput and rate tracking
 * - Automated bottleneck detection
 * - Performance alerting
 * - Minimal overhead (< 5% impact)
 *
 * HIPAA Note: This service only tracks performance metrics,
 * never logs actual health data or PHI.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

// Performance thresholds (ms)
const THRESHOLDS = {
  // API response time thresholds
  api: {
    warning: 500,    // 500ms warning threshold
    critical: 2000,  // 2s critical threshold
  },
  // Database query thresholds
  database: {
    warning: 100,    // 100ms for slow query warning
    critical: 500,   // 500ms for critical slow query
  },
  // Memory thresholds (bytes)
  memory: {
    warning: 0.7,    // 70% of heap used
    critical: 0.85,  // 85% of heap used
  },
};

// Metric retention settings
const RETENTION = {
  realtimeWindow: 60 * 1000,      // 1 minute for real-time metrics
  shortTermWindow: 5 * 60 * 1000, // 5 minutes for short-term
  aggregationInterval: 60 * 1000,  // Aggregate every minute
  maxDataPoints: 1440,             // 24 hours of minute-level data
};

/**
 * Circular buffer for efficient metric storage
 */
class CircularBuffer {
  constructor(maxSize) {
    this.buffer = [];
    this.maxSize = maxSize;
    this.writeIndex = 0;
  }

  push(item) {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(item);
    } else {
      this.buffer[this.writeIndex] = item;
    }
    this.writeIndex = (this.writeIndex + 1) % this.maxSize;
  }

  getAll() {
    return [...this.buffer];
  }

  getRecent(count) {
    const items = this.getAll();
    return items.slice(-count);
  }

  clear() {
    this.buffer = [];
    this.writeIndex = 0;
  }

  get length() {
    return this.buffer.length;
  }
}

/**
 * Percentile calculator using reservoir sampling
 */
class PercentileCalculator {
  constructor(maxSamples = 1000) {
    this.samples = [];
    this.maxSamples = maxSamples;
    this.count = 0;
  }

  add(value) {
    this.count++;
    if (this.samples.length < this.maxSamples) {
      this.samples.push(value);
    } else {
      // Reservoir sampling for memory-efficient percentile tracking
      const replaceIndex = Math.floor(Math.random() * this.count);
      if (replaceIndex < this.maxSamples) {
        this.samples[replaceIndex] = value;
      }
    }
  }

  getPercentile(p) {
    if (this.samples.length === 0) return 0;

    const sorted = [...this.samples].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  getStats() {
    if (this.samples.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.samples].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      count: this.count,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p50: this.getPercentile(50),
      p95: this.getPercentile(95),
      p99: this.getPercentile(99),
    };
  }

  reset() {
    this.samples = [];
    this.count = 0;
  }
}

/**
 * Endpoint metrics tracker
 */
class EndpointMetrics {
  constructor() {
    this.responseTime = new PercentileCalculator();
    this.requestCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
    this.lastRequest = null;
    this.payloadSizes = new PercentileCalculator(500);
  }

  record(duration, statusCode, payloadSize = 0) {
    this.responseTime.add(duration);
    this.requestCount++;
    this.lastRequest = Date.now();

    if (statusCode >= 400) {
      this.errorCount++;
    } else {
      this.successCount++;
    }

    if (payloadSize > 0) {
      this.payloadSizes.add(payloadSize);
    }
  }

  getStats() {
    const responseStats = this.responseTime.getStats();
    const payloadStats = this.payloadSizes.getStats();

    return {
      requestCount: this.requestCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
      responseTime: responseStats,
      payloadSize: payloadStats,
      lastRequest: this.lastRequest,
    };
  }

  reset() {
    this.responseTime.reset();
    this.payloadSizes.reset();
    this.requestCount = 0;
    this.errorCount = 0;
    this.successCount = 0;
  }
}

/**
 * Query metrics tracker
 */
class QueryMetrics {
  constructor() {
    this.executionTime = new PercentileCalculator();
    this.queryCount = 0;
    this.errorCount = 0;
    this.slowQueryCount = 0;
    this.recentQueries = new CircularBuffer(100);
  }

  record(query, duration, error = null) {
    this.executionTime.add(duration);
    this.queryCount++;

    if (error) {
      this.errorCount++;
    }

    if (duration > THRESHOLDS.database.warning) {
      this.slowQueryCount++;
    }

    // Store recent slow queries for analysis (sanitized, no PHI)
    if (duration > THRESHOLDS.database.warning) {
      this.recentQueries.push({
        query: this.sanitizeQuery(query),
        duration,
        timestamp: Date.now(),
        error: error ? error.message : null,
      });
    }
  }

  sanitizeQuery(query) {
    // Remove actual values, keep structure for analysis
    if (typeof query !== 'string') return '[complex query]';

    return query
      .replace(/'[^']*'/g, "'?'")  // Replace string values
      .replace(/\d+/g, '?')        // Replace numbers
      .substring(0, 200);          // Truncate for storage
  }

  getStats() {
    const timeStats = this.executionTime.getStats();

    return {
      queryCount: this.queryCount,
      errorCount: this.errorCount,
      slowQueryCount: this.slowQueryCount,
      executionTime: timeStats,
      recentSlowQueries: this.recentQueries.getRecent(10),
    };
  }

  reset() {
    this.executionTime.reset();
    this.recentQueries.clear();
    this.queryCount = 0;
    this.errorCount = 0;
    this.slowQueryCount = 0;
  }
}

/**
 * Main APM Service class
 */
class APMService extends EventEmitter {
  constructor() {
    super();

    // Endpoint metrics by route pattern
    this.endpoints = new Map();

    // Database query metrics
    this.queryMetrics = new QueryMetrics();

    // Connection pool metrics
    this.connectionPool = {
      total: 0,
      active: 0,
      idle: 0,
      waiting: 0,
      errors: 0,
    };

    // System metrics
    this.systemMetrics = new CircularBuffer(RETENTION.maxDataPoints);

    // Alerts buffer
    this.alerts = new CircularBuffer(100);

    // Time-series data for trends
    this.timeSeries = {
      throughput: new CircularBuffer(RETENTION.maxDataPoints),
      errorRate: new CircularBuffer(RETENTION.maxDataPoints),
      avgResponseTime: new CircularBuffer(RETENTION.maxDataPoints),
    };

    // Aggregation state
    this.aggregationState = {
      lastAggregation: Date.now(),
      requestsInWindow: 0,
      errorsInWindow: 0,
      totalResponseTime: 0,
    };

    // Start periodic tasks
    this.startPeriodicTasks();

    // Track service start time
    this.startTime = Date.now();

    logger.info('APM Service initialized');
  }

  /**
   * Start periodic aggregation and cleanup tasks
   */
  startPeriodicTasks() {
    // Aggregate metrics every minute
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, RETENTION.aggregationInterval);

    // Collect system metrics every 10 seconds
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 10000);

    // Check for bottlenecks every 30 seconds
    this.bottleneckCheckInterval = setInterval(() => {
      this.checkBottlenecks();
    }, 30000);
  }

  /**
   * Stop all periodic tasks
   */
  stop() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    if (this.bottleneckCheckInterval) {
      clearInterval(this.bottleneckCheckInterval);
    }
    logger.info('APM Service stopped');
  }

  /**
   * Normalize route pattern (remove dynamic segments)
   */
  normalizeRoute(url, method) {
    // Remove query string
    const path = url.split('?')[0];

    // Replace UUIDs and numeric IDs with :id placeholder
    const normalized = path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');

    return `${method} ${normalized}`;
  }

  /**
   * Record API request metrics
   */
  recordRequest(request, reply, duration) {
    const route = this.normalizeRoute(request.url, request.method);
    const statusCode = reply.statusCode;

    // Get or create endpoint metrics
    if (!this.endpoints.has(route)) {
      this.endpoints.set(route, new EndpointMetrics());
    }

    const metrics = this.endpoints.get(route);
    const payloadSize = reply.getHeader('content-length') || 0;

    metrics.record(duration, statusCode, parseInt(payloadSize) || 0);

    // Update aggregation state
    this.aggregationState.requestsInWindow++;
    this.aggregationState.totalResponseTime += duration;
    if (statusCode >= 400) {
      this.aggregationState.errorsInWindow++;
    }

    // Check for slow endpoint and emit alert
    if (duration > THRESHOLDS.api.critical) {
      this.emitAlert('api_critical', {
        route,
        duration,
        threshold: THRESHOLDS.api.critical,
        statusCode,
      });
    } else if (duration > THRESHOLDS.api.warning) {
      this.emitAlert('api_slow', {
        route,
        duration,
        threshold: THRESHOLDS.api.warning,
        statusCode,
      });
    }

    // Emit event for real-time monitoring
    this.emit('request', { route, duration, statusCode });
  }

  /**
   * Record database query metrics
   */
  recordQuery(query, duration, error = null) {
    this.queryMetrics.record(query, duration, error);

    // Check for slow query and emit alert
    if (duration > THRESHOLDS.database.critical) {
      this.emitAlert('db_critical', {
        query: this.queryMetrics.sanitizeQuery(query),
        duration,
        threshold: THRESHOLDS.database.critical,
        error: error?.message,
      });
    } else if (duration > THRESHOLDS.database.warning) {
      this.emitAlert('db_slow', {
        query: this.queryMetrics.sanitizeQuery(query),
        duration,
        threshold: THRESHOLDS.database.warning,
      });
    }

    // Emit event for real-time monitoring
    this.emit('query', { duration, hasError: !!error });
  }

  /**
   * Update connection pool metrics
   */
  updateConnectionPool(stats) {
    this.connectionPool = {
      ...this.connectionPool,
      ...stats,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Collect system metrics (CPU, memory)
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const metrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        heapUsedPercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
    };

    this.systemMetrics.push(metrics);

    // Check memory threshold
    const heapPercent = memUsage.heapUsed / memUsage.heapTotal;
    if (heapPercent > THRESHOLDS.memory.critical) {
      this.emitAlert('memory_critical', {
        heapUsedPercent: (heapPercent * 100).toFixed(2),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      });
    } else if (heapPercent > THRESHOLDS.memory.warning) {
      this.emitAlert('memory_warning', {
        heapUsedPercent: (heapPercent * 100).toFixed(2),
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
      });
    }

    return metrics;
  }

  /**
   * Aggregate metrics for time-series
   */
  aggregateMetrics() {
    const now = Date.now();
    const elapsed = (now - this.aggregationState.lastAggregation) / 1000;

    // Calculate rates
    const throughput = this.aggregationState.requestsInWindow / elapsed;
    const errorRate = this.aggregationState.requestsInWindow > 0
      ? (this.aggregationState.errorsInWindow / this.aggregationState.requestsInWindow) * 100
      : 0;
    const avgResponseTime = this.aggregationState.requestsInWindow > 0
      ? this.aggregationState.totalResponseTime / this.aggregationState.requestsInWindow
      : 0;

    // Store in time-series
    this.timeSeries.throughput.push({ timestamp: now, value: throughput });
    this.timeSeries.errorRate.push({ timestamp: now, value: errorRate });
    this.timeSeries.avgResponseTime.push({ timestamp: now, value: avgResponseTime });

    // Reset aggregation state
    this.aggregationState = {
      lastAggregation: now,
      requestsInWindow: 0,
      errorsInWindow: 0,
      totalResponseTime: 0,
    };

    // Emit aggregation event
    this.emit('aggregation', { throughput, errorRate, avgResponseTime });
  }

  /**
   * Check for bottlenecks across the system
   */
  checkBottlenecks() {
    const bottlenecks = [];

    // Check endpoints for consistent slow performance
    for (const [route, metrics] of this.endpoints) {
      const stats = metrics.getStats();
      if (stats.responseTime.p95 > THRESHOLDS.api.warning && stats.requestCount > 10) {
        bottlenecks.push({
          type: 'endpoint',
          route,
          p95: stats.responseTime.p95,
          requestCount: stats.requestCount,
          severity: stats.responseTime.p95 > THRESHOLDS.api.critical ? 'critical' : 'warning',
        });
      }
    }

    // Check database for slow queries
    const queryStats = this.queryMetrics.getStats();
    if (queryStats.slowQueryCount > 10 && queryStats.queryCount > 0) {
      const slowQueryPercent = (queryStats.slowQueryCount / queryStats.queryCount) * 100;
      if (slowQueryPercent > 5) {
        bottlenecks.push({
          type: 'database',
          slowQueryPercent: slowQueryPercent.toFixed(2),
          slowQueryCount: queryStats.slowQueryCount,
          p95: queryStats.executionTime.p95,
          severity: slowQueryPercent > 10 ? 'critical' : 'warning',
        });
      }
    }

    // Check connection pool
    if (this.connectionPool.waiting > 5) {
      bottlenecks.push({
        type: 'connection_pool',
        waiting: this.connectionPool.waiting,
        active: this.connectionPool.active,
        total: this.connectionPool.total,
        severity: this.connectionPool.waiting > 10 ? 'critical' : 'warning',
      });
    }

    // Emit bottleneck events
    if (bottlenecks.length > 0) {
      this.emit('bottlenecks', bottlenecks);

      for (const bottleneck of bottlenecks) {
        this.emitAlert(`bottleneck_${bottleneck.type}`, bottleneck);
      }
    }

    return bottlenecks;
  }

  /**
   * Emit and store alert
   */
  emitAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: Date.now(),
      id: `${type}-${Date.now()}`,
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Log alert
    const logLevel = type.includes('critical') ? 'error' : 'warn';
    logger[logLevel](`APM Alert: ${type}`, data);
  }

  /**
   * Get comprehensive APM dashboard data
   */
  getDashboard() {
    // Get endpoint stats
    const endpointStats = {};
    for (const [route, metrics] of this.endpoints) {
      endpointStats[route] = metrics.getStats();
    }

    // Sort endpoints by request count
    const sortedEndpoints = Object.entries(endpointStats)
      .sort((a, b) => b[1].requestCount - a[1].requestCount)
      .slice(0, 20); // Top 20 endpoints

    // Get slowest endpoints
    const slowestEndpoints = Object.entries(endpointStats)
      .filter(([, stats]) => stats.requestCount > 5)
      .sort((a, b) => b[1].responseTime.p95 - a[1].responseTime.p95)
      .slice(0, 10); // Top 10 slowest

    // Get highest error rate endpoints
    const errorEndpoints = Object.entries(endpointStats)
      .filter(([, stats]) => stats.requestCount > 5)
      .sort((a, b) => b[1].errorRate - a[1].errorRate)
      .slice(0, 10);

    return {
      overview: {
        uptime: Date.now() - this.startTime,
        totalEndpoints: this.endpoints.size,
        totalRequests: Array.from(this.endpoints.values())
          .reduce((sum, m) => sum + m.getStats().requestCount, 0),
      },
      database: {
        ...this.queryMetrics.getStats(),
        connectionPool: this.connectionPool,
      },
      endpoints: {
        top: sortedEndpoints,
        slowest: slowestEndpoints,
        highestErrorRate: errorEndpoints,
      },
      system: {
        current: this.systemMetrics.getRecent(1)[0] || null,
        history: this.systemMetrics.getRecent(60), // Last hour
      },
      timeSeries: {
        throughput: this.timeSeries.throughput.getRecent(60),
        errorRate: this.timeSeries.errorRate.getRecent(60),
        avgResponseTime: this.timeSeries.avgResponseTime.getRecent(60),
      },
      alerts: this.alerts.getRecent(50),
      bottlenecks: this.checkBottlenecks(),
      thresholds: THRESHOLDS,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get real-time metrics snapshot
   */
  getRealTimeMetrics() {
    const recentSystem = this.systemMetrics.getRecent(1)[0];

    return {
      throughput: this.timeSeries.throughput.getRecent(1)[0]?.value || 0,
      errorRate: this.timeSeries.errorRate.getRecent(1)[0]?.value || 0,
      avgResponseTime: this.timeSeries.avgResponseTime.getRecent(1)[0]?.value || 0,
      memory: recentSystem?.memory || null,
      connectionPool: this.connectionPool,
      activeEndpoints: this.endpoints.size,
      timestamp: Date.now(),
    };
  }

  /**
   * Get endpoint-specific metrics
   */
  getEndpointMetrics(route) {
    if (!this.endpoints.has(route)) {
      return null;
    }
    return this.endpoints.get(route).getStats();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset() {
    this.endpoints.clear();
    this.queryMetrics.reset();
    this.systemMetrics.clear();
    this.alerts.clear();
    this.timeSeries.throughput.clear();
    this.timeSeries.errorRate.clear();
    this.timeSeries.avgResponseTime.clear();
    this.aggregationState = {
      lastAggregation: Date.now(),
      requestsInWindow: 0,
      errorsInWindow: 0,
      totalResponseTime: 0,
    };
    logger.info('APM metrics reset');
  }

  /**
   * Get configuration and thresholds
   */
  getConfig() {
    return {
      thresholds: THRESHOLDS,
      retention: RETENTION,
    };
  }

  /**
   * Update thresholds dynamically
   */
  updateThresholds(newThresholds) {
    if (newThresholds.api) {
      Object.assign(THRESHOLDS.api, newThresholds.api);
    }
    if (newThresholds.database) {
      Object.assign(THRESHOLDS.database, newThresholds.database);
    }
    if (newThresholds.memory) {
      Object.assign(THRESHOLDS.memory, newThresholds.memory);
    }
    logger.info('APM thresholds updated', { newThresholds });
  }
}

// Export singleton instance
const apmService = new APMService();
export default apmService;

// Export class for testing
export { APMService, THRESHOLDS, RETENTION };
