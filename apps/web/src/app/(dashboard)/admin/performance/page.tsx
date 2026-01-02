// PROJECT IMPORTS
import PerformanceDashboard from 'views/admin/PerformanceDashboard';

/**
 * ==============================|| PERFORMANCE MONITORING PAGE ||==============================
 *
 * Application Performance Monitoring (APM) Dashboard
 *
 * BACKEND API ROUTES (ACTIVE & CONFIRMED):
 * Base path: /api/apm
 * Most routes require VIEW_REPORTS or manage_system permission
 *
 * GET    /api/apm/dashboard              - Get comprehensive APM dashboard
 * GET    /api/apm/realtime               - Get real-time metrics snapshot
 * GET    /api/apm/endpoints              - Get endpoint metrics (sortBy, limit params)
 * GET    /api/apm/endpoints/:method/*    - Get specific endpoint metrics
 * GET    /api/apm/database               - Get database query performance metrics
 * GET    /api/apm/system                 - Get system resource metrics (CPU, memory)
 * GET    /api/apm/timeseries/:metric     - Get time-series data (throughput, errorRate, avgResponseTime)
 * GET    /api/apm/bottlenecks            - Get current bottleneck analysis
 * GET    /api/apm/alerts                 - Get recent performance alerts
 * GET    /api/apm/config                 - Get APM configuration and thresholds
 * PUT    /api/apm/config/thresholds      - Update APM thresholds (admin only)
 * POST   /api/apm/reset                  - Reset all APM metrics (admin only)
 * GET    /api/apm/health                 - APM service health check (public)
 *
 * FEATURES:
 * - Real-time performance monitoring with auto-refresh
 * - API endpoint performance tracking (p50, p95, p99 percentiles)
 * - Database query monitoring with slow query detection
 * - Memory and CPU usage tracking
 * - Automated bottleneck detection
 * - Performance alerts and notifications
 * - Historical trend analysis
 *
 * HIPAA COMPLIANCE:
 * - Only tracks performance metrics, never logs PHI
 * - All sensitive data is sanitized before storage
 * - Minimal overhead (< 5% performance impact)
 *
 * All API calls use the http instance from 'hooks/useCookie' which includes:
 * - Base URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
 * - withCredentials: true (for cookie-based authentication)
 * - Automatic 401 error handling (redirects to login)
 */

const PerformanceMonitoring = () => {
  return <PerformanceDashboard />;
};

export default PerformanceMonitoring;
