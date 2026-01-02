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
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingIcon from '@mui/icons-material/Timeline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AssessmentIcon from '@mui/icons-material/Assessment';

// Project Imports
import MainCard from 'components/MainCard';
import SimpleLineChart from 'components/charts/SimpleLineChart';
import {
  getRevenueDashboard,
  getAccrualTimeline,
  getAccrualReconciliation,
  generateCollectionForecast,
  generateScenarioForecast,
  getCashFlowProjections,
  getCashFlowProjectionById,
  getCashFlowScenarios,
  getRunwayMetrics,
  getPayerPatterns,
  exportRevenueToCSV,
  exportForecastToCSV,
  formatCurrency,
  formatPercentage,
  getLOCDisplayName,
  getRecognitionStatusColor,
  getPayerBehaviorColor,
  formatScenarioType,
  type RevenueDashboardKPIs,
  type AccrualTimelinePoint,
  type CollectionForecastResponse,
  type ScenarioForecastResponse,
  type CashFlowProjection,
  type CashFlowProjectionDetail,
  type ScenarioComparison,
  type PayerPattern,
  type ForecastModel,
  type ScenarioType,
  type LevelOfCare
} from 'api/revenue';

// ==============================|| PERIOD OPTIONS ||============================== //

const PERIOD_OPTIONS = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_quarter', label: 'Current Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' }
];

const FORECAST_MODEL_OPTIONS: { value: ForecastModel; label: string }[] = [
  { value: 'comprehensive', label: 'Comprehensive (All Models)' },
  { value: 'census', label: 'Census-Based' },
  { value: 'loc', label: 'Level of Care' },
  { value: 'historical', label: 'Historical Trend' },
  { value: 'scenario', label: 'Scenario Analysis' }
];

// ==============================|| KPI CARD ||============================== //

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'increasing' | 'decreasing' | 'stable';
    change: number;
  };
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  onClick?: () => void;
}

const KPICard = ({ title, value, subtitle, trend, color = 'primary', icon, onClick }: KPICardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'increasing':
        return <TrendingUpIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'decreasing':
        return <TrendingDownIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      default:
        return <TrendingFlatIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 4 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: `${color}.main` }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
            {getTrendIcon()}
            <Typography
              variant="body2"
              sx={{
                color: trend.direction === 'stable' ? 'text.secondary' :
                  (trend.direction === 'increasing' ? 'success.main' : 'error.main')
              }}
            >
              {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)}% vs prior period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// ==============================|| MAIN DASHBOARD ||============================== //

const RevenueDashboard = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('current_month');
  const [activeTab, setActiveTab] = useState(0);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<RevenueDashboardKPIs | null>(null);
  const [timelineData, setTimelineData] = useState<AccrualTimelinePoint[]>([]);
  const [reconciliationData, setReconciliationData] = useState<any>(null);

  // Forecasting Data
  const [forecastModel, setForecastModel] = useState<ForecastModel>('comprehensive');
  const [forecastData, setForecastData] = useState<CollectionForecastResponse | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioForecastResponse | null>(null);

  // Cash Flow Data
  const [cashFlowProjections, setCashFlowProjections] = useState<CashFlowProjection[]>([]);
  const [selectedProjection, setSelectedProjection] = useState<number | null>(null);
  const [cashFlowDetail, setCashFlowDetail] = useState<CashFlowProjectionDetail | null>(null);
  const [cashFlowScenarios, setCashFlowScenarios] = useState<ScenarioComparison | null>(null);
  const [runwayMetrics, setRunwayMetrics] = useState<any>(null);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');

  // Payer Analysis
  const [payerPatterns, setPayerPatterns] = useState<PayerPattern[]>([]);

  // Load Dashboard Data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboard, timeline] = await Promise.all([
        getRevenueDashboard({ period }),
        getAccrualTimeline({
          start_date: getDateRange(period).start,
          end_date: getDateRange(period).end
        })
      ]);

      setDashboardData(dashboard);
      setTimelineData(timeline);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  // Load Forecast Data
  const loadForecastData = useCallback(async () => {
    try {
      if (forecastModel === 'scenario') {
        const scenarios = await generateScenarioForecast({ months_ahead: 12 });
        setScenarioData(scenarios);
        setForecastData(null);
      } else {
        const forecast = await generateCollectionForecast({
          model: forecastModel,
          months_ahead: 12,
          include_confidence: true
        });
        setForecastData(forecast);
        setScenarioData(null);
      }
    } catch (err: any) {
      console.error('Forecast error:', err);
      setError(err.message || 'Failed to load forecast data');
    }
  }, [forecastModel]);

  // Load Cash Flow Data
  const loadCashFlowData = useCallback(async () => {
    try {
      const projections = await getCashFlowProjections();
      setCashFlowProjections(projections);

      if (projections.length > 0 && !selectedProjection) {
        const firstProjection = projections[0];
        setSelectedProjection(firstProjection.id);

        const [detail, scenarios, runway] = await Promise.all([
          getCashFlowProjectionById(firstProjection.id),
          getCashFlowScenarios(firstProjection.id),
          getRunwayMetrics(firstProjection.id)
        ]);

        setCashFlowDetail(detail);
        setCashFlowScenarios(scenarios);
        setRunwayMetrics(runway);
      }
    } catch (err: any) {
      console.error('Cash flow error:', err);
    }
  }, [selectedProjection]);

  // Load Payer Patterns
  const loadPayerPatterns = useCallback(async () => {
    try {
      const patterns = await getPayerPatterns();
      setPayerPatterns(patterns);
    } catch (err: any) {
      console.error('Payer patterns error:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    loadDashboardData();
    loadPayerPatterns();
  }, [loadDashboardData, loadPayerPatterns]);

  useEffect(() => {
    if (activeTab === 1) {
      loadForecastData();
    }
  }, [activeTab, loadForecastData]);

  useEffect(() => {
    if (activeTab === 2) {
      loadCashFlowData();
    }
  }, [activeTab, loadCashFlowData]);

  // Handlers
  const handlePeriodChange = (event: any) => {
    setPeriod(event.target.value);
  };

  const handleTabChange = (event: any, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadDashboardData();
    if (activeTab === 1) loadForecastData();
    if (activeTab === 2) loadCashFlowData();
  };

  const handleExportCSV = async () => {
    try {
      const blob = await exportRevenueToCSV({
        start_date: getDateRange(period).start,
        end_date: getDateRange(period).end
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-data-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      setError('Failed to export data');
    }
  };

  // Helper function to get date range
  function getDateRange(period: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    switch (period) {
      case 'last_month':
        start.setMonth(start.getMonth() - 1);
        end.setMonth(end.getMonth() - 1);
        break;
      case 'current_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        end.setMonth((quarter + 1) * 3, 0);
        break;
      case 'ytd':
        start.setMonth(0, 1);
        break;
      case 'last_30_days':
        start.setDate(now.getDate() - 30);
        end.setTime(now.getTime());
        break;
      case 'last_90_days':
        start.setDate(now.getDate() - 90);
        end.setTime(now.getTime());
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  // Prepare timeline chart data
  const prepareTimelineChartData = () => {
    if (!timelineData || timelineData.length === 0) return [];

    return timelineData.map(point => ({
      label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: point.accrued_amount / 100,
      secondary: point.collected_amount / 100
    }));
  };

  // Prepare forecast chart data
  const prepareForecastChartData = () => {
    if (!forecastData?.periods || forecastData.periods.length === 0) return [];

    return forecastData.periods.map(period => ({
      label: new Date(period.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      value: period.forecasted_revenue / 100,
      secondary: period.forecasted_collections / 100
    }));
  };

  // Prepare scenario chart data
  const prepareScenarioChartData = () => {
    if (!scenarioData?.scenarios) return [];

    const scenarioKey = selectedScenario;
    const periods = scenarioData.scenarios[scenarioKey];

    if (!periods || periods.length === 0) return [];

    return periods.map(period => ({
      label: new Date(period.period_start).toLocaleDateString('en-US', { month: 'short' }),
      value: period.forecasted_revenue / 100
    }));
  };

  // Prepare cash flow chart data
  const prepareCashFlowChartData = () => {
    if (!cashFlowScenarios?.scenarios) return [];

    const periods = cashFlowScenarios.scenarios[selectedScenario];
    if (!periods || periods.length === 0) return [];

    return periods.map(period => ({
      label: new Date(period.period_start).toLocaleDateString('en-US', { month: 'short' }),
      value: period.net_cash_flow / 100,
      secondary: period.cumulative_cash / 100
    }));
  };

  if (loading && !dashboardData) {
    return (
      <MainCard title="Revenue Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Revenue Dashboard"
      secondary={
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={handlePeriodChange} label="Period">
              {PERIOD_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export to CSV">
            <IconButton onClick={handleExportCSV} size="small">
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Accrual Tracking" />
        <Tab label="Revenue Forecasting" />
        <Tab label="Cash Flow Projections" />
      </Tabs>

      {/* TAB 0: ACCRUAL TRACKING */}
      {activeTab === 0 && (
        <>
          {/* KPI Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Total Accrued Revenue"
                value={dashboardData?.accruals.total_accrued_formatted || '$0.00'}
                subtitle={dashboardData?.period.label}
                icon={<AccountBalanceIcon color="primary" />}
                color="primary"
                trend={dashboardData ? {
                  direction: dashboardData.trends.revenue_trend,
                  change: dashboardData.trends.revenue_change_percent
                } : undefined}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Total Collected"
                value={dashboardData?.accruals.total_collected_formatted || '$0.00'}
                subtitle={`${((dashboardData?.metrics.collection_rate || 0) * 100).toFixed(1)}% collection rate`}
                icon={<AttachMoneyIcon color="success" />}
                color="success"
                trend={dashboardData ? {
                  direction: dashboardData.trends.collection_trend,
                  change: dashboardData.trends.collection_change_percent
                } : undefined}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Outstanding Revenue"
                value={dashboardData?.accruals.total_outstanding_formatted || '$0.00'}
                subtitle={`${dashboardData?.metrics.avg_days_to_collect || 0} avg days to collect`}
                icon={<PendingIcon color="warning" />}
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Recognition Rate"
                value={`${((dashboardData?.metrics.recognition_rate || 0) * 100).toFixed(1)}%`}
                subtitle={`${((dashboardData?.metrics.write_off_rate || 0) * 100).toFixed(2)}% write-off rate`}
                icon={<CheckCircleIcon color="info" />}
                color="info"
              />
            </Grid>
          </Grid>

          {/* Accrual Timeline Chart */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Accrual Timeline
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Historical trends for accrued and collected revenue
                  </Typography>
                  {timelineData.length > 0 ? (
                    <SimpleLineChart
                      data={prepareTimelineChartData()}
                      height={300}
                      primaryLabel="Accrued"
                      secondaryLabel="Collected"
                      showSecondary={true}
                      areaFill={true}
                    />
                  ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No timeline data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Revenue by Level of Care */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Revenue by Level of Care
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Level of Care</TableCell>
                          <TableCell align="right">Days</TableCell>
                          <TableCell align="right">Billed</TableCell>
                          <TableCell align="right">Collected</TableCell>
                          <TableCell align="right">Rate</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dashboardData?.by_loc.map((loc) => (
                          <TableRow key={loc.level_of_care}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {getLOCDisplayName(loc.level_of_care)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{loc.total_days}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(loc.total_billed)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(loc.total_collected)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(loc.avg_daily_rate)}/day
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Payer Performance */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Payer Performance
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Payer</TableCell>
                          <TableCell align="right">Collection Rate</TableCell>
                          <TableCell align="right">Avg Days</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payerPatterns.slice(0, 5).map((payer) => (
                          <TableRow key={payer.payer_id}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {payer.payer_name}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              {(payer.collection_rate * 100).toFixed(1)}%
                            </TableCell>
                            <TableCell align="right">
                              {payer.avg_days_to_pay.toFixed(0)}
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={payer.payment_behavior}
                                color={getPayerBehaviorColor(payer.payment_behavior)}
                                size="small"
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
        </>
      )}

      {/* TAB 1: REVENUE FORECASTING */}
      {activeTab === 1 && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6">Revenue Forecast</Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel>Forecast Model</InputLabel>
                        <Select
                          value={forecastModel}
                          onChange={(e) => setForecastModel(e.target.value as ForecastModel)}
                          label="Forecast Model"
                        >
                          {FORECAST_MODEL_OPTIONS.map(option => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {forecastModel === 'scenario' && (
                        <ToggleButtonGroup
                          value={selectedScenario}
                          exclusive
                          onChange={(e, val) => val && setSelectedScenario(val)}
                          size="small"
                        >
                          <ToggleButton value="optimistic">Best Case</ToggleButton>
                          <ToggleButton value="base">Expected</ToggleButton>
                          <ToggleButton value="pessimistic">Worst Case</ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    </Stack>
                  </Stack>

                  {forecastModel === 'scenario' && scenarioData ? (
                    <SimpleLineChart
                      data={prepareScenarioChartData()}
                      height={350}
                      primaryLabel="Forecasted Revenue"
                      areaFill={true}
                    />
                  ) : forecastData ? (
                    <>
                      <SimpleLineChart
                        data={prepareForecastChartData()}
                        height={350}
                        primaryLabel="Forecasted Revenue"
                        secondaryLabel="Forecasted Collections"
                        showSecondary={true}
                        areaFill={true}
                      />
                      {forecastData.confidence_metrics && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Confidence Level:</strong> {forecastData.confidence_metrics.confidence_level}
                            {' | '}
                            <strong>Coefficient of Variation:</strong>{' '}
                            {(forecastData.confidence_metrics.coefficient_of_variation * 100).toFixed(2)}%
                          </Typography>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Generating forecast...
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Forecast Summary */}
          {forecastData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <KPICard
                  title="Total Forecasted Revenue"
                  value={formatCurrency(forecastData.total_forecasted_revenue)}
                  subtitle="Next 12 months"
                  icon={<ShowChartIcon color="primary" />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <KPICard
                  title="Expected Collections"
                  value={formatCurrency(forecastData.total_forecasted_collections)}
                  subtitle="Next 12 months"
                  icon={<AttachMoneyIcon color="success" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <KPICard
                  title="Forecast Model"
                  value={forecastData.forecast_model.toUpperCase()}
                  subtitle={`Generated ${new Date(forecastData.generated_at).toLocaleString()}`}
                  icon={<AssessmentIcon color="info" />}
                  color="info"
                />
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* TAB 2: CASH FLOW PROJECTIONS */}
      {activeTab === 2 && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography variant="h6">Cash Flow Projection</Typography>
                    <ToggleButtonGroup
                      value={selectedScenario}
                      exclusive
                      onChange={(e, val) => val && setSelectedScenario(val)}
                      size="small"
                    >
                      <ToggleButton value="optimistic">Best Case</ToggleButton>
                      <ToggleButton value="base">Expected</ToggleButton>
                      <ToggleButton value="pessimistic">Worst Case</ToggleButton>
                    </ToggleButtonGroup>
                  </Stack>

                  {cashFlowScenarios ? (
                    <SimpleLineChart
                      data={prepareCashFlowChartData()}
                      height={350}
                      primaryLabel="Net Cash Flow"
                      secondaryLabel="Cumulative Cash"
                      showSecondary={true}
                      areaFill={false}
                    />
                  ) : (
                    <Box sx={{ py: 8, textAlign: 'center' }}>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Loading cash flow data...
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Runway Metrics */}
          {runwayMetrics && cashFlowScenarios && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <KPICard
                  title="Current Cash Position"
                  value={formatCurrency(runwayMetrics.current_cash)}
                  icon={<AccountBalanceIcon color="primary" />}
                  color="primary"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <KPICard
                  title="Monthly Burn Rate"
                  value={formatCurrency(runwayMetrics.monthly_burn_rate)}
                  subtitle="Average monthly expenses"
                  icon={<TrendingIcon color="error" />}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <KPICard
                  title="Runway"
                  value={`${runwayMetrics.runway_months.toFixed(1)} months`}
                  subtitle={runwayMetrics.cash_depletion_date ? `Until ${new Date(runwayMetrics.cash_depletion_date).toLocaleDateString()}` : undefined}
                  icon={<ShowChartIcon color="warning" />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <KPICard
                  title={formatScenarioType(selectedScenario)}
                  value={formatCurrency(
                    selectedScenario === 'optimistic'
                      ? cashFlowScenarios.comparison_summary.best_case_ending_cash
                      : selectedScenario === 'base'
                      ? cashFlowScenarios.comparison_summary.expected_ending_cash
                      : cashFlowScenarios.comparison_summary.worst_case_ending_cash
                  )}
                  subtitle="Ending cash position"
                  icon={<AssessmentIcon color="info" />}
                  color="info"
                />
              </Grid>
            </Grid>
          )}
        </>
      )}
    </MainCard>
  );
};

export default RevenueDashboard;
