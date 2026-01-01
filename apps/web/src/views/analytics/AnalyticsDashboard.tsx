'use client';

import { useState, useEffect, useCallback } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';

// Project Imports
import MainCard from 'components/MainCard';
import {
  getExecutiveDashboard,
  getTimeSeries,
  getForecast,
  exportReport,
  PERIOD_OPTIONS,
  ExecutiveDashboard,
  KPI,
  DashboardAlert,
  TimeSeriesResponse,
  ForecastResponse,
  MetricType,
  TimeInterval,
  getDateRangeForPeriod,
  getStatusColor
} from 'api/analytics';

// Chart Components
import {
  SimpleBarChart,
  SimpleLineChart,
  SimpleDonutChart,
  SimpleGaugeChart,
  BarChartDataPoint,
  LineChartDataPoint
} from 'components/charts';

// ==============================|| TAB PANEL ||============================== //

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

// ==============================|| KPI CARD ||============================== //

interface KPICardProps {
  kpi: KPI;
  onClick?: () => void;
}

const KPICard = ({ kpi, onClick }: KPICardProps) => {
  const getTrendIcon = () => {
    if (!kpi.trend) return null;
    switch (kpi.trend.direction) {
      case 'positive':
        return <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'negative':
        return <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      default:
        return <TrendingFlatIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  const getStatusChip = () => {
    if (!kpi.status) return null;
    const color = getStatusColor(kpi.status);
    return (
      <Chip
        label={kpi.status.replace('_', ' ')}
        size="small"
        color={color as any}
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 4
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {kpi.label}
          </Typography>
          {getStatusChip()}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
          {kpi.formatted}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getTrendIcon()}
          {kpi.trend && (
            <Typography
              variant="body2"
              sx={{
                color: kpi.trend.direction === 'positive' ? 'success.main' :
                       kpi.trend.direction === 'negative' ? 'error.main' : 'text.secondary'
              }}
            >
              {kpi.trend.percentage > 0 ? '+' : ''}{kpi.trend.percentage}%
            </Typography>
          )}
          {kpi.target && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              Target: {kpi.type === 'percentage' ? `${kpi.target}%` :
                       kpi.type === 'days' ? `${kpi.target} days` : kpi.target}
            </Typography>
          )}
        </Box>
        {kpi.target && kpi.type === 'percentage' && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min((kpi.value / kpi.target) * 100, 100)}
              color={kpi.status === 'excellent' || kpi.status === 'on_target' ? 'success' :
                     kpi.status === 'warning' ? 'warning' : 'error'}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        )}
        {onClick && (
          <Box sx={{ mt: 1, textAlign: 'right' }}>
            <Typography variant="caption" color="primary">
              Click to view details
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ==============================|| ALERT CARD ||============================== //

interface AlertCardProps {
  alert: DashboardAlert;
}

const AlertCard = ({ alert }: AlertCardProps) => {
  const getIcon = () => {
    switch (alert.type) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      default:
        return <CheckCircleIcon color="info" />;
    }
  };

  return (
    <Alert
      severity={alert.type === 'critical' ? 'error' : alert.type}
      icon={getIcon()}
      sx={{ mb: 1 }}
    >
      <Typography variant="subtitle2">{alert.title}</Typography>
      <Typography variant="body2">{alert.message}</Typography>
      {alert.action && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Action: {alert.action}
        </Typography>
      )}
    </Alert>
  );
};

// ==============================|| DRILL-DOWN DIALOG ||============================== //

interface DrillDownDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  kpi?: KPI;
  timeSeriesData?: TimeSeriesResponse | null;
  forecastData?: ForecastResponse | null;
  loading?: boolean;
}

const DrillDownDialog = ({
  open,
  onClose,
  title,
  kpi,
  timeSeriesData,
  forecastData,
  loading
}: DrillDownDialogProps) => {
  const formatCurrency = (cents: number) => {
    const dollars = cents / 100;
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // Prepare chart data
  const chartData: LineChartDataPoint[] = timeSeriesData?.data_points.map(dp => ({
    label: dp.period,
    value: dp.value,
    secondary: dp.moving_avg || undefined
  })) || [];

  // Add forecast data if available
  const forecastChartData: BarChartDataPoint[] = forecastData?.forecasts.map((f, i) => ({
    label: `Period ${f.period}`,
    value: f.ensemble
  })) || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShowChartIcon color="primary" />
          {title} - Detailed Analysis
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Current Value Summary */}
            {kpi && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Current Value</Typography>
                    <Typography variant="h5">{kpi.formatted}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Trend</Typography>
                    <Typography variant="h5" sx={{
                      color: kpi.trend?.direction === 'positive' ? 'success.main' :
                             kpi.trend?.direction === 'negative' ? 'error.main' : 'text.primary'
                    }}>
                      {kpi.trend ? `${kpi.trend.percentage > 0 ? '+' : ''}${kpi.trend.percentage}%` : 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Target</Typography>
                    <Typography variant="h5">{kpi.target || 'Not Set'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Chip
                      label={kpi.status?.replace('_', ' ') || 'N/A'}
                      color={getStatusColor(kpi.status) as any}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Time Series Chart */}
            {chartData.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Historical Trend</Typography>
                <SimpleLineChart
                  data={chartData}
                  height={250}
                  showArea
                  showDots
                  formatValue={kpi?.type === 'currency' ? formatCurrency : (v) => v.toLocaleString()}
                  primaryLabel="Value"
                  secondaryLabel="Moving Avg"
                />
              </Box>
            )}

            {/* Statistics */}
            {timeSeriesData?.statistics && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Statistics</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Count</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.count}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Mean</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.mean.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Std Dev</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.std_dev.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Min</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.min.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Max</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.max.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="caption" color="text.secondary">Median</Typography>
                    <Typography variant="body1">{timeSeriesData.statistics.p50.toFixed(2)}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Forecast */}
            {forecastChartData.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>Forecast (Next {forecastData?.periods_ahead || 3} Periods)</Typography>
                <SimpleBarChart
                  data={forecastChartData}
                  height={180}
                  formatValue={kpi?.type === 'currency' ? formatCurrency : (v) => v.toLocaleString()}
                />
                {forecastData?.confidence_interval && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Confidence: {forecastData.confidence_interval.confidence_level} |
                    95% CI: {forecastData.confidence_interval.confidence_95_lower.toFixed(2)} - {forecastData.confidence_interval.confidence_95_upper.toFixed(2)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| ANALYTICS DASHBOARD ||============================== //

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('current_month');
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownKpi, setDrillDownKpi] = useState<KPI | undefined>();
  const [drillDownTimeSeries, setDrillDownTimeSeries] = useState<TimeSeriesResponse | null>(null);
  const [drillDownForecast, setDrillDownForecast] = useState<ForecastResponse | null>(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  // Time series state for charts
  const [revenueTimeSeries, setRevenueTimeSeries] = useState<TimeSeriesResponse | null>(null);
  const [claimsTimeSeries, setClaimsTimeSeries] = useState<TimeSeriesResponse | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExecutiveDashboard(period, true);
      setDashboard(data);

      // Also fetch time series data for charts
      const dateRange = getDateRangeForPeriod(period);
      try {
        const [revenue, claims] = await Promise.all([
          getTimeSeries('revenue', dateRange.start_date, dateRange.end_date, 'week'),
          getTimeSeries('claims', dateRange.start_date, dateRange.end_date, 'week')
        ]);
        setRevenueTimeSeries(revenue);
        setClaimsTimeSeries(claims);
      } catch {
        // Silently fail for time series - main dashboard still works
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePeriodChange = (event: any) => {
    setPeriod(event.target.value);
  };

  const handleRefresh = () => {
    fetchDashboard();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleKpiClick = async (kpi: KPI) => {
    setDrillDownTitle(kpi.label);
    setDrillDownKpi(kpi);
    setDrillDownOpen(true);
    setDrillDownLoading(true);
    setDrillDownTimeSeries(null);
    setDrillDownForecast(null);

    // Determine metric type based on KPI id
    let metricType: MetricType = 'revenue';
    if (kpi.id.includes('claim') || kpi.id.includes('denial')) {
      metricType = 'claims';
    } else if (kpi.id.includes('collection')) {
      metricType = 'collections';
    } else if (kpi.id.includes('encounter') || kpi.id.includes('patient')) {
      metricType = 'encounters';
    }

    try {
      const dateRange = getDateRangeForPeriod(period);
      const [timeSeries, forecast] = await Promise.all([
        getTimeSeries(metricType, dateRange.start_date, dateRange.end_date, 'week'),
        getForecast(metricType, 3)
      ]);
      setDrillDownTimeSeries(timeSeries);
      setDrillDownForecast(forecast);
    } catch {
      // Some data may not be available
    } finally {
      setDrillDownLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const dateRange = getDateRangeForPeriod(period);
      const blob = await exportReport('executive_summary', format, dateRange.start_date, dateRange.end_date);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics_dashboard_${period}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
    }
  };

  // Prepare chart data
  const claimsByStatusData: BarChartDataPoint[] = dashboard?.operational.claims_by_status.map(item => ({
    label: item.status,
    value: item.count,
    color: item.status === 'PAID' ? '#4caf50' :
           item.status === 'SUBMITTED' ? '#2196f3' :
           item.status === 'PENDING' ? '#ff9800' :
           item.status === 'DENIED' ? '#f44336' : '#9e9e9e'
  })) || [];

  const claimsByPayerData: DonutChartSegment[] = dashboard?.operational.claims_by_payer.slice(0, 6).map(payer => ({
    label: payer.payer_name,
    value: payer.claim_count
  })) || [];

  const arAgingData: BarChartDataPoint[] = dashboard?.financial.ar_aging ? [
    { label: '0-30 Days', value: dashboard.financial.ar_aging.current / 100, color: '#4caf50' },
    { label: '31-60 Days', value: dashboard.financial.ar_aging.aging_31_60 / 100, color: '#2196f3' },
    { label: '61-90 Days', value: dashboard.financial.ar_aging.aging_61_90 / 100, color: '#ff9800' },
    { label: '90+ Days', value: dashboard.financial.ar_aging.aging_over_90 / 100, color: '#f44336' }
  ] : [];

  const revenueChartData: LineChartDataPoint[] = revenueTimeSeries?.data_points.map(dp => ({
    label: dp.period,
    value: dp.value / 100,
    secondary: dp.moving_avg ? dp.moving_avg / 100 : undefined
  })) || [];

  if (loading && !dashboard) {
    return (
      <MainCard title="Analytics Dashboard">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={60} />
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={140} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard title="Analytics Dashboard">
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        }>
          {error}
        </Alert>
      </MainCard>
    );
  }

  return (
    <>
      <MainCard
        title="Analytics Dashboard"
        secondary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Period</InputLabel>
              <Select value={period} onChange={handlePeriodChange} label="Period">
                {PERIOD_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Export CSV">
              <IconButton onClick={() => handleExport('csv')} size="small">
                <FileDownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton onClick={handleRefresh} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        }
      >
        <Box>
          {/* Period Info */}
          {dashboard?.period && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {dashboard.period.label}: {dashboard.period.start} to {dashboard.period.end}
            </Typography>
          )}

          {/* Alerts */}
          {dashboard?.alerts && dashboard.alerts.length > 0 && (
            <Box sx={{ mb: 3 }}>
              {dashboard.alerts.map((alert, index) => (
                <AlertCard key={index} alert={alert} />
              ))}
            </Box>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
              <Tab icon={<AssessmentIcon />} iconPosition="start" label="Overview" />
              <Tab icon={<MonetizationOnIcon />} iconPosition="start" label="Financial" />
              <Tab icon={<LocalHospitalIcon />} iconPosition="start" label="Clinical" />
              <Tab icon={<SettingsIcon />} iconPosition="start" label="Operational" />
              <Tab icon={<SecurityIcon />} iconPosition="start" label="Compliance" />
            </Tabs>
          </Box>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            {/* KPIs */}
            <Typography variant="h6" gutterBottom>Key Performance Indicators</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              {dashboard?.kpis.map((kpi) => (
                <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.id}>
                  <KPICard kpi={kpi} onClick={() => handleKpiClick(kpi)} />
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Charts Row */}
            <Grid container spacing={3}>
              {/* Revenue Trend */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Revenue Trend</Typography>
                    {revenueChartData.length > 0 ? (
                      <SimpleLineChart
                        data={revenueChartData}
                        height={250}
                        showArea
                        showDots
                        formatValue={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                        primaryLabel="Revenue"
                        secondaryLabel="Moving Avg"
                      />
                    ) : (
                      <Box sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No trend data available</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Claims by Payer */}
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Claims by Payer</Typography>
                    {claimsByPayerData.length > 0 ? (
                      <SimpleDonutChart
                        data={claimsByPayerData}
                        size={180}
                        thickness={35}
                        centerLabel="Total Claims"
                        centerValue={dashboard?.financial.total_claims.toString()}
                      />
                    ) : (
                      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No payer data available</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Claims by Status */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Claims by Status</Typography>
                    {claimsByStatusData.length > 0 ? (
                      <SimpleBarChart
                        data={claimsByStatusData}
                        height={200}
                        orientation="vertical"
                      />
                    ) : (
                      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No status data available</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* AR Aging */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>AR Aging Distribution</Typography>
                    {arAgingData.length > 0 ? (
                      <SimpleBarChart
                        data={arAgingData}
                        height={200}
                        orientation="horizontal"
                        formatValue={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                      />
                    ) : (
                      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography color="text.secondary">No AR aging data available</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Financial Tab */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={3}>
              {/* Key Financial Metrics */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Charges</Typography>
                        <Typography variant="h4">{dashboard?.financial.total_charges_formatted}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Payments</Typography>
                        <Typography variant="h4">{dashboard?.financial.total_payments_formatted}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Net Collection Rate</Typography>
                        <Typography variant="h4" sx={{ color: 'success.main' }}>
                          {dashboard?.financial.net_collection_rate}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Avg Days to Payment</Typography>
                        <Typography variant="h4">{dashboard?.financial.avg_days_to_payment} days</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Collection Rate Gauge */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Collection Rate</Typography>
                    <SimpleGaugeChart
                      value={dashboard?.financial.net_collection_rate || 0}
                      label="Net Collection"
                      thresholds={{ warning: 85, critical: 70 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Clean Claim Rate Gauge */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Clean Claim Rate</Typography>
                    <SimpleGaugeChart
                      value={dashboard?.financial.clean_claim_rate || 0}
                      label="Clean Claims"
                      thresholds={{ warning: 90, critical: 80 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Denial Rate Gauge */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Denial Rate</Typography>
                    <SimpleGaugeChart
                      value={100 - (dashboard?.financial.denial_rate || 0)}
                      formatValue={(v) => `${(100 - v).toFixed(1)}%`}
                      label="Denial Rate (lower is better)"
                      thresholds={{ warning: 90, critical: 85 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* AR Aging Detail */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>AR Aging Analysis</Typography>
                    <SimpleBarChart
                      data={arAgingData}
                      height={250}
                      orientation="horizontal"
                      formatValue={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Clinical Tab */}
          <TabPanel value={tabValue} index={2}>
            <Grid container spacing={3}>
              {/* Clinical Metrics */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Active Patients</Typography>
                        <Typography variant="h4">{dashboard?.clinical.active_patients}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Encounters</Typography>
                        <Typography variant="h4">{dashboard?.clinical.total_encounters}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                        <Typography variant="h4" sx={{ color: 'success.main' }}>
                          {dashboard?.clinical.encounter_completion_rate}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
                        <Typography variant="h4">{dashboard?.clinical.avg_encounter_duration}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Encounter Completion Gauge */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Encounter Completion</Typography>
                    <SimpleGaugeChart
                      value={dashboard?.clinical.encounter_completion_rate || 0}
                      label="Completed Encounters"
                      thresholds={{ warning: 85, critical: 70 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Encounters by Discipline */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Encounters by Discipline</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {dashboard?.clinical.by_discipline?.map((item) => (
                        <Chip
                          key={item.discipline}
                          label={`${item.discipline}: ${item.count}`}
                          size="medium"
                          variant="outlined"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Operational Tab */}
          <TabPanel value={tabValue} index={3}>
            <Grid container spacing={3}>
              {/* Claims by Status Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Claims by Status</Typography>
                    <SimpleBarChart
                      data={claimsByStatusData}
                      height={250}
                      orientation="vertical"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Claims by Payer Chart */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Claims Distribution by Payer</Typography>
                    <SimpleDonutChart
                      data={claimsByPayerData}
                      size={200}
                      thickness={40}
                      centerLabel="Claims"
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Payer Performance Table */}
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Payer Performance</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Payer</TableCell>
                            <TableCell align="right">Claims</TableCell>
                            <TableCell align="right">Total Charges</TableCell>
                            <TableCell align="right">Collection Rate</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboard?.operational.claims_by_payer?.map((payer) => (
                            <TableRow key={payer.payer_id}>
                              <TableCell>{payer.payer_name}</TableCell>
                              <TableCell align="right">{payer.claim_count}</TableCell>
                              <TableCell align="right">
                                ${(payer.total_charges / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${payer.collection_rate}%`}
                                  size="small"
                                  color={payer.collection_rate >= 90 ? 'success' :
                                         payer.collection_rate >= 75 ? 'warning' : 'error'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Compliance Tab */}
          <TabPanel value={tabValue} index={4}>
            <Grid container spacing={3}>
              {/* Compliance Metrics */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Claims Audited</Typography>
                        <Typography variant="h4">{dashboard?.compliance.total_claims_audited}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Compliance Score</Typography>
                        <Typography variant="h4" sx={{
                          color: (dashboard?.compliance.compliance_score || 0) >= 95 ? 'success.main' :
                                 (dashboard?.compliance.compliance_score || 0) >= 85 ? 'warning.main' : 'error.main'
                        }}>
                          {dashboard?.compliance.compliance_score}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Scrubbing Pass Rate</Typography>
                        <Typography variant="h4" sx={{ color: 'success.main' }}>
                          {dashboard?.compliance.scrubbing_pass_rate}%
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Pending Audit</Typography>
                        <Typography variant="h4">{dashboard?.compliance.pending_audit}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>

              {/* Compliance Score Gauge */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Overall Compliance</Typography>
                    <SimpleGaugeChart
                      value={dashboard?.compliance.compliance_score || 0}
                      label="Compliance Score"
                      thresholds={{ warning: 90, critical: 80 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Scrubbing Rate Gauge */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>Scrubbing Pass Rate</Typography>
                    <SimpleGaugeChart
                      value={dashboard?.compliance.scrubbing_pass_rate || 0}
                      label="Pass Rate"
                      thresholds={{ warning: 95, critical: 90 }}
                    />
                  </CardContent>
                </Card>
              </Grid>

              {/* Compliance Breakdown */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Compliance Breakdown</Typography>
                    <SimpleDonutChart
                      data={[
                        { label: 'Pass', value: dashboard?.compliance.scrubbing_pass_rate || 0, color: '#4caf50' },
                        { label: 'Fail', value: dashboard?.compliance.scrubbing_fail_rate || 0, color: '#f44336' }
                      ]}
                      size={160}
                      thickness={30}
                      centerLabel="Scrubbing"
                    />
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              Last updated: {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString() : 'N/A'}
            </Typography>
          </Box>
        </Box>
      </MainCard>

      {/* Drill-Down Dialog */}
      <DrillDownDialog
        open={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        title={drillDownTitle}
        kpi={drillDownKpi}
        timeSeriesData={drillDownTimeSeries}
        forecastData={drillDownForecast}
        loading={drillDownLoading}
      />
    </>
  );
};

export default AnalyticsDashboard;
