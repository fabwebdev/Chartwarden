/**
 * APM (Application Performance Monitoring) Routes
 *
 * Provides endpoints for:
 * - Real-time performance dashboard
 * - Historical metrics and trends
 * - Bottleneck detection
 * - Alert history
 * - Configuration management
 *
 * Access Control: VIEW_REPORTS or ADMIN permission required
 */

import apmService from '../services/APM.service.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * APM Routes Plugin
 */
export default async function apmRoutes(fastify, options) {
  // All APM routes require VIEW_REPORTS or higher
  const apmAuth = requireAnyPermission(PERMISSIONS.VIEW_REPORTS, 'manage_system');

  // ============================================================================
  // DASHBOARD & OVERVIEW
  // ============================================================================

  /**
   * Get comprehensive APM dashboard
   * Returns all metrics for the performance dashboard
   */
  fastify.get('/apm/dashboard', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get comprehensive APM dashboard with all performance metrics',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dashboard = apmService.getDashboard();
    return {
      status: 'success',
      data: dashboard,
    };
  });

  /**
   * Get real-time metrics snapshot
   * Lightweight endpoint for frequent polling
   */
  fastify.get('/apm/realtime', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get real-time metrics snapshot for live monitoring',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const metrics = apmService.getRealTimeMetrics();
    return {
      status: 'success',
      data: metrics,
    };
  });

  // ============================================================================
  // ENDPOINT METRICS
  // ============================================================================

  /**
   * Get metrics for all endpoints
   */
  fastify.get('/apm/endpoints', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get performance metrics for all API endpoints',
      tags: ['APM'],
      querystring: {
        type: 'object',
        properties: {
          sortBy: {
            type: 'string',
            enum: ['requestCount', 'p95', 'errorRate'],
            default: 'requestCount',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { sortBy = 'requestCount', limit = 20 } = request.query;
    const dashboard = apmService.getDashboard();

    // Get all endpoint stats
    const endpoints = Object.entries(dashboard.endpoints.top || {});

    // Sort based on parameter
    let sorted;
    switch (sortBy) {
      case 'p95':
        sorted = endpoints.sort((a, b) =>
          (b[1]?.responseTime?.p95 || 0) - (a[1]?.responseTime?.p95 || 0)
        );
        break;
      case 'errorRate':
        sorted = endpoints.sort((a, b) =>
          (b[1]?.errorRate || 0) - (a[1]?.errorRate || 0)
        );
        break;
      default:
        sorted = endpoints.sort((a, b) =>
          (b[1]?.requestCount || 0) - (a[1]?.requestCount || 0)
        );
    }

    return {
      status: 'success',
      data: {
        endpoints: sorted.slice(0, limit),
        total: endpoints.length,
      },
    };
  });

  /**
   * Get metrics for a specific endpoint pattern
   */
  fastify.get('/apm/endpoints/:method/*', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get metrics for a specific endpoint',
      tags: ['APM'],
      params: {
        type: 'object',
        properties: {
          method: { type: 'string' },
          '*': { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { method } = request.params;
    const path = '/' + request.params['*'];
    const route = `${method.toUpperCase()} ${path}`;

    const metrics = apmService.getEndpointMetrics(route);

    if (!metrics) {
      reply.code(404);
      return {
        status: 'error',
        message: `No metrics found for endpoint: ${route}`,
      };
    }

    return {
      status: 'success',
      data: {
        route,
        metrics,
      },
    };
  });

  // ============================================================================
  // DATABASE METRICS
  // ============================================================================

  /**
   * Get database query performance metrics
   */
  fastify.get('/apm/database', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get database query performance metrics',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dashboard = apmService.getDashboard();

    return {
      status: 'success',
      data: dashboard.database,
    };
  });

  // ============================================================================
  // SYSTEM METRICS
  // ============================================================================

  /**
   * Get system resource metrics (CPU, memory)
   */
  fastify.get('/apm/system', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get system resource metrics',
      tags: ['APM'],
      querystring: {
        type: 'object',
        properties: {
          history: {
            type: 'integer',
            minimum: 1,
            maximum: 1440,
            default: 60,
            description: 'Number of historical data points',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dashboard = apmService.getDashboard();

    return {
      status: 'success',
      data: dashboard.system,
    };
  });

  // ============================================================================
  // TIME-SERIES DATA
  // ============================================================================

  /**
   * Get time-series metrics for trends
   */
  fastify.get('/apm/timeseries/:metric', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get time-series data for a specific metric',
      tags: ['APM'],
      params: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: ['throughput', 'errorRate', 'avgResponseTime'],
          },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          points: {
            type: 'integer',
            minimum: 1,
            maximum: 1440,
            default: 60,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { metric } = request.params;
    const dashboard = apmService.getDashboard();

    return {
      status: 'success',
      data: {
        metric,
        timeSeries: dashboard.timeSeries[metric] || [],
      },
    };
  });

  // ============================================================================
  // BOTTLENECK DETECTION
  // ============================================================================

  /**
   * Get current bottleneck analysis
   */
  fastify.get('/apm/bottlenecks', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get current performance bottleneck analysis',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const bottlenecks = apmService.checkBottlenecks();

    return {
      status: 'success',
      data: {
        bottlenecks,
        count: bottlenecks.length,
        hasCritical: bottlenecks.some(b => b.severity === 'critical'),
      },
    };
  });

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Get recent performance alerts
   */
  fastify.get('/apm/alerts', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get recent performance alerts',
      tags: ['APM'],
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 50,
          },
          type: {
            type: 'string',
            description: 'Filter by alert type',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { limit = 50, type } = request.query;
    const dashboard = apmService.getDashboard();

    let alerts = dashboard.alerts;
    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }

    return {
      status: 'success',
      data: {
        alerts: alerts.slice(0, limit),
        total: alerts.length,
      },
    };
  });

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get APM configuration and thresholds
   */
  fastify.get('/apm/config', {
    preHandler: [apmAuth],
    schema: {
      description: 'Get APM configuration and thresholds',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const config = apmService.getConfig();

    return {
      status: 'success',
      data: config,
    };
  });

  /**
   * Update APM thresholds
   * Requires admin permission
   */
  fastify.put('/apm/config/thresholds', {
    preHandler: [requireAnyPermission('manage_system')],
    schema: {
      description: 'Update APM thresholds',
      tags: ['APM'],
      body: {
        type: 'object',
        properties: {
          api: {
            type: 'object',
            properties: {
              warning: { type: 'number' },
              critical: { type: 'number' },
            },
          },
          database: {
            type: 'object',
            properties: {
              warning: { type: 'number' },
              critical: { type: 'number' },
            },
          },
          memory: {
            type: 'object',
            properties: {
              warning: { type: 'number' },
              critical: { type: 'number' },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
  }, async (request, reply) => {
    apmService.updateThresholds(request.body);
    const config = apmService.getConfig();

    return {
      status: 'success',
      message: 'Thresholds updated successfully',
      data: config,
    };
  });

  /**
   * Reset APM metrics
   * Requires admin permission
   */
  fastify.post('/apm/reset', {
    preHandler: [requireAnyPermission('manage_system')],
    schema: {
      description: 'Reset all APM metrics',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    apmService.reset();

    return {
      status: 'success',
      message: 'APM metrics reset successfully',
    };
  });

  // ============================================================================
  // HEALTH CHECK (Public for monitoring tools)
  // ============================================================================

  /**
   * APM health check endpoint (no auth required for monitoring)
   */
  fastify.get('/apm/health', {
    schema: {
      description: 'APM service health check',
      tags: ['APM'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const dashboard = apmService.getDashboard();

    return {
      status: 'healthy',
      uptime: dashboard.overview.uptime,
      activeEndpoints: dashboard.overview.totalEndpoints,
      totalRequests: dashboard.overview.totalRequests,
    };
  });
}
