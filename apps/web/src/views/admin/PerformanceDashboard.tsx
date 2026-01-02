'use client';

import React, { useState, useEffect, useCallback } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

// Icons
import {
  Refresh2,
  Timer1,
  Cpu,
  Data,
  Warning2,
  TickCircle,
  CloseCircle,
  Clock,
  Chart21,
  Activity
} from 'iconsax-react';

// Project Imports
import MainCard from 'components/MainCard';
import SimpleLineChart, { LineChartDataPoint } from 'components/charts/SimpleLineChart';
import {
  getAPMDashboard,
  getRealTimeMetrics,
  getBottlenecks,
  formatBytes,
  formatMs,
  formatUptime,
  APMDashboard,
  RealTimeMetrics,
  Bottleneck,
  EndpointStats
} from '../../api/apm';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

// Status indicator component
const StatusIndicator = ({ status }: { status: 'healthy' | 'warning' | 'critical' }) => {
  const colors = {
    healthy: 'success',
    warning: 'warning',
    critical: 'error'
  } as const;

  const labels = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical'
  };

  return (
    <Chip
      icon={status === 'healthy' ? <TickCircle size={16} /> : <Warning2 size={16} />}
      label={labels[status]}
      color={colors[status]}
      size="small"
    />
  );
};

const PerformanceDashboard: React.FC = () => {
  // State
  const [dashboard, setDashboard] = useState<APMDashboard | null>(null);
  const [realtime, setRealtime] = useState<RealTimeMetrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardData, bottleneckData] = await Promise.all([
        getAPMDashboard(),
        getBottlenecks()
      ]);
      setDashboard(dashboardData);
      setBottlenecks(bottleneckData.bottlenecks);
      setError(null);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number }; message?: string };
      console.error('Error fetching APM dashboard:', error);
      if (error.response?.status !== 401) {
        setError('Failed to load performance data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch real-time metrics (lightweight)
  const fetchRealtime = useCallback(async () => {
    try {
      const data = await getRealTimeMetrics();
      setRealtime(data);
    } catch (err) {
      // Silently fail for real-time updates
      console.debug('Real-time metrics fetch failed:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    // Real-time metrics every 5 seconds
    const realtimeInterval = setInterval(fetchRealtime, 5000);
    // Full dashboard every 30 seconds
    const dashboardInterval = setInterval(fetchDashboard, 30000);

    return () => {
      clearInterval(realtimeInterval);
      clearInterval(dashboardInterval);
    };
  }, [autoRefresh, fetchRealtime, fetchDashboard]);

  // Calculate overall health status
  const getHealthStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!realtime) return 'healthy';
    if (realtime.errorRate > 10) return 'critical';
    if (realtime.errorRate > 5 || realtime.avgResponseTime > 2000) return 'warning';
    return 'healthy';
  };

  // Convert time series to chart data
  const getChartData = (
    series: Array<{ timestamp: number; value: number }>,
    label: string
  ): LineChartDataPoint[] => {
    return series.map(point => ({
      label: new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: point.value
    }));
  };

  // Render overview cards
  const renderOverviewCards = () => {
    const current = realtime || dashboard;
    if (!current) return null;

    const memoryPercent = realtime?.memory?.heapUsedPercent ?? 0;

    return (
      <Grid container spacing={3}>
        {/* Uptime */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.lighter' }}>
                  <Clock size={24} color="var(--mui-palette-primary-main)" />
                </Box>
                <Box>
                  <Typography variant="h4">
                    {formatUptime(dashboard?.overview.uptime || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Uptime</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Throughput */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'success.lighter' }}>
                  <Activity size={24} color="var(--mui-palette-success-main)" />
                </Box>
                <Box>
                  <Typography variant="h4">
                    {(realtime?.throughput || 0).toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Requests/sec</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.lighter' }}>
                  <Timer1 size={24} color="var(--mui-palette-warning-main)" />
                </Box>
                <Box>
                  <Typography variant="h4">
                    {formatMs(realtime?.avgResponseTime || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Avg Response</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Rate */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: (realtime?.errorRate || 0) > 5 ? 'error.lighter' : 'grey.100'
                }}>
                  {(realtime?.errorRate || 0) > 5 ? (
                    <CloseCircle size={24} color="var(--mui-palette-error-main)" />
                  ) : (
                    <TickCircle size={24} color="var(--mui-palette-grey-600)" />
                  )}
                </Box>
                <Box>
                  <Typography variant="h4">
                    {(realtime?.errorRate || 0).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Error Rate</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Cpu size={20} />
                    <Typography variant="subtitle2">Memory Usage</Typography>
                  </Stack>
                  <Typography variant="h6">{memoryPercent.toFixed(1)}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={memoryPercent}
                  color={memoryPercent > 85 ? 'error' : memoryPercent > 70 ? 'warning' : 'primary'}
                  sx={{ height: 8, borderRadius: 1 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {realtime?.memory ? formatBytes(realtime.memory.heapUsed) : '0 B'} / {realtime?.memory ? formatBytes(realtime.memory.heapTotal) : '0 B'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Pool */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Data size={20} />
                    <Typography variant="subtitle2">Connection Pool</Typography>
                  </Stack>
                </Stack>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Active</Typography>
                    <Typography variant="h6">{realtime?.connectionPool?.active || 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Idle</Typography>
                    <Typography variant="h6">{realtime?.connectionPool?.idle || 0}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Waiting</Typography>
                    <Typography variant="h6" color={(realtime?.connectionPool?.waiting || 0) > 0 ? 'warning.main' : 'text.primary'}>
                      {realtime?.connectionPool?.waiting || 0}
                    </Typography>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Bottlenecks */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Warning2 size={20} />
                    <Typography variant="subtitle2">Bottlenecks</Typography>
                  </Stack>
                  <StatusIndicator status={getHealthStatus()} />
                </Stack>
                <Typography variant="h4" color={bottlenecks.length > 0 ? 'warning.main' : 'success.main'}>
                  {bottlenecks.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {bottlenecks.filter(b => b.severity === 'critical').length} critical, {bottlenecks.filter(b => b.severity === 'warning').length} warnings
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  // Render endpoints table
  const renderEndpointsTable = (endpoints: Array<[string, EndpointStats]>) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Endpoint</TableCell>
          <TableCell align="right">Requests</TableCell>
          <TableCell align="right">p50</TableCell>
          <TableCell align="right">p95</TableCell>
          <TableCell align="right">p99</TableCell>
          <TableCell align="right">Error Rate</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {endpoints.slice(0, 10).map(([route, stats]) => (
          <TableRow key={route} hover>
            <TableCell>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {route}
              </Typography>
            </TableCell>
            <TableCell align="right">{stats.requestCount}</TableCell>
            <TableCell align="right">{formatMs(stats.responseTime.p50)}</TableCell>
            <TableCell align="right">
              <Typography
                variant="body2"
                color={stats.responseTime.p95 > 500 ? 'warning.main' : 'text.primary'}
              >
                {formatMs(stats.responseTime.p95)}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography
                variant="body2"
                color={stats.responseTime.p99 > 2000 ? 'error.main' : 'text.primary'}
              >
                {formatMs(stats.responseTime.p99)}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Chip
                label={`${stats.errorRate.toFixed(1)}%`}
                size="small"
                color={stats.errorRate > 5 ? 'error' : stats.errorRate > 1 ? 'warning' : 'success'}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  // Render bottlenecks list
  const renderBottlenecks = () => (
    <Stack spacing={2}>
      {bottlenecks.length === 0 ? (
        <Alert severity="success">No bottlenecks detected. System is performing optimally.</Alert>
      ) : (
        bottlenecks.map((bottleneck, index) => (
          <Alert
            key={index}
            severity={bottleneck.severity === 'critical' ? 'error' : 'warning'}
          >
            <Stack>
              <Typography variant="subtitle2">
                {bottleneck.type === 'endpoint' && `Slow Endpoint: ${bottleneck.route}`}
                {bottleneck.type === 'database' && 'Database Performance Issue'}
                {bottleneck.type === 'connection_pool' && 'Connection Pool Exhaustion'}
              </Typography>
              <Typography variant="body2">
                {bottleneck.type === 'endpoint' && `p95: ${formatMs(bottleneck.p95 || 0)} (${bottleneck.requestCount} requests)`}
                {bottleneck.type === 'database' && `${bottleneck.slowQueryPercent}% slow queries (${bottleneck.slowQueryCount} total)`}
                {bottleneck.type === 'connection_pool' && `${bottleneck.waiting} connections waiting`}
              </Typography>
            </Stack>
          </Alert>
        ))
      )}
    </Stack>
  );

  // Render database stats
  const renderDatabaseStats = () => {
    if (!dashboard?.database) return null;

    const db = dashboard.database;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <MainCard title="Query Performance">
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Total Queries</Typography>
                  <Typography variant="h5">{db.queryCount}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Errors</Typography>
                  <Typography variant="h5" color="error.main">{db.errorCount}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Slow Queries</Typography>
                  <Typography variant="h5" color="warning.main">{db.slowQueryCount}</Typography>
                </Grid>
              </Grid>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Response Time Percentiles</Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">p50</Typography>
                    <Typography variant="body2">{formatMs(db.executionTime.p50)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">p95</Typography>
                    <Typography variant="body2">{formatMs(db.executionTime.p95)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">p99</Typography>
                    <Typography variant="body2">{formatMs(db.executionTime.p99)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          </MainCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <MainCard title="Recent Slow Queries">
            {db.recentSlowQueries.length === 0 ? (
              <Typography color="text.secondary">No slow queries recorded</Typography>
            ) : (
              <Stack spacing={1}>
                {db.recentSlowQueries.slice(0, 5).map((query, index) => (
                  <Box key={index} sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {query.query}
                      </Typography>
                      <Chip
                        label={formatMs(query.duration)}
                        size="small"
                        color={query.duration > 500 ? 'error' : 'warning'}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </MainCard>
        </Grid>
      </Grid>
    );
  };

  // Render alerts
  const renderAlerts = () => {
    if (!dashboard?.alerts) return null;

    return (
      <Stack spacing={2}>
        {dashboard.alerts.length === 0 ? (
          <Alert severity="info">No recent alerts</Alert>
        ) : (
          dashboard.alerts.slice(0, 20).map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.type.includes('critical') ? 'error' : 'warning'}
            >
              <Stack>
                <Typography variant="subtitle2">{alert.type.replace(/_/g, ' ').toUpperCase()}</Typography>
                <Typography variant="body2">
                  {new Date(alert.timestamp).toLocaleString()}
                </Typography>
              </Stack>
            </Alert>
          ))
        )}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchDashboard}>
          <Refresh2 size={18} />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Performance Monitoring</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh"
          />
          <Tooltip title="Refresh now">
            <IconButton onClick={fetchDashboard} color="primary">
              <Refresh2 size={20} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Overview Cards */}
      {renderOverviewCards()}

      {/* Main Content */}
      <MainCard sx={{ mt: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Chart21 size={18} />} label="Overview" />
          <Tab icon={<Timer1 size={18} />} label="Endpoints" />
          <Tab icon={<Data size={18} />} label="Database" />
          <Tab icon={<Warning2 size={18} />} label="Alerts" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Throughput Chart */}
            <Grid item xs={12} md={6}>
              <MainCard title="Request Throughput (req/sec)">
                {dashboard?.timeSeries.throughput && dashboard.timeSeries.throughput.length > 0 ? (
                  <SimpleLineChart
                    data={getChartData(dashboard.timeSeries.throughput, 'Throughput')}
                    height={200}
                    primaryLabel="Throughput"
                    formatValue={(v) => v.toFixed(2)}
                  />
                ) : (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Collecting data...
                  </Typography>
                )}
              </MainCard>
            </Grid>

            {/* Response Time Chart */}
            <Grid item xs={12} md={6}>
              <MainCard title="Average Response Time (ms)">
                {dashboard?.timeSeries.avgResponseTime && dashboard.timeSeries.avgResponseTime.length > 0 ? (
                  <SimpleLineChart
                    data={getChartData(dashboard.timeSeries.avgResponseTime, 'Response Time')}
                    height={200}
                    primaryLabel="Response Time"
                    formatValue={(v) => `${v.toFixed(0)} ms`}
                  />
                ) : (
                  <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Collecting data...
                  </Typography>
                )}
              </MainCard>
            </Grid>

            {/* Bottlenecks */}
            <Grid item xs={12}>
              <MainCard title="Active Bottlenecks">
                {renderBottlenecks()}
              </MainCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Endpoints Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MainCard title="Top Endpoints by Request Count">
                {dashboard?.endpoints.top && renderEndpointsTable(dashboard.endpoints.top)}
              </MainCard>
            </Grid>
            <Grid item xs={12} md={6}>
              <MainCard title="Slowest Endpoints (by p95)">
                {dashboard?.endpoints.slowest && renderEndpointsTable(dashboard.endpoints.slowest)}
              </MainCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Database Tab */}
        <TabPanel value={activeTab} index={2}>
          {renderDatabaseStats()}
        </TabPanel>

        {/* Alerts Tab */}
        <TabPanel value={activeTab} index={3}>
          {renderAlerts()}
        </TabPanel>
      </MainCard>
    </Box>
  );
};

export default PerformanceDashboard;
