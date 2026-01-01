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
import TablePagination from '@mui/material/TablePagination';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

// Project Imports
import MainCard from 'components/MainCard';
import {
  SimpleBarChart,
  SimpleLineChart,
  SimpleDonutChart,
  SimpleGaugeChart,
  BarChartDataPoint,
  LineChartDataPoint
} from 'components/charts';

// API
import {
  getCapMetrics,
  getCapUtilizationReport,
  getPatientsApproachingCap,
  getCapExceededPatients,
  getComplianceIssues,
  bulkRecalculateCaps,
  getCapYearOptions,
  getCurrentCapYear,
  formatCurrency,
  getUtilizationStatus,
  getUtilizationColor,
  getStatusColor,
  getSeverityColor,
  CapMetrics,
  CapUtilizationReport,
  CapTrackingWithPatient,
  ComplianceIssue
} from 'api/capTracking';

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
      id={`cap-tracking-tabpanel-${index}`}
      aria-labelledby={`cap-tracking-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

// ==============================|| METRIC CARD ||============================== //

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
  };
}

const MetricCard = ({ title, value, subtitle, icon, color = 'primary', trend }: MetricCardProps) => {
  const getColorPalette = () => {
    switch (color) {
      case 'success':
        return { bg: 'success.lighter', main: 'success.main' };
      case 'warning':
        return { bg: 'warning.lighter', main: 'warning.main' };
      case 'error':
        return { bg: 'error.lighter', main: 'error.main' };
      case 'info':
        return { bg: 'info.lighter', main: 'info.main' };
      default:
        return { bg: 'primary.lighter', main: 'primary.main' };
    }
  };

  const palette = getColorPalette();

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 600, color: palette.main }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <TrendingUpIcon
                  sx={{
                    fontSize: 16,
                    color: trend.direction === 'up' ? 'error.main' : 'success.main',
                    transform: trend.direction === 'down' ? 'rotate(180deg)' : 'none'
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: trend.direction === 'up' ? 'error.main' : 'success.main'
                  }}
                >
                  {trend.value}% from last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: palette.bg,
              color: palette.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ==============================|| UTILIZATION PROGRESS BAR ||============================== //

interface UtilizationProgressProps {
  percentage: number;
  showLabel?: boolean;
  height?: number;
}

const UtilizationProgress = ({ percentage, showLabel = true, height = 10 }: UtilizationProgressProps) => {
  const status = getUtilizationStatus(percentage);
  const color = getStatusColor(status);

  return (
    <Box sx={{ width: '100%' }}>
      {showLabel && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Utilization
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: getUtilizationColor(percentage)
            }}
          >
            {percentage.toFixed(1)}%
          </Typography>
        </Box>
      )}
      <LinearProgress
        variant="determinate"
        value={Math.min(percentage, 100)}
        color={color}
        sx={{
          height,
          borderRadius: height / 2,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: height / 2
          }
        }}
      />
    </Box>
  );
};

// ==============================|| ALERT BANNER ||============================== //

interface AlertBannerProps {
  exceededCount: number;
  approachingCount: number;
  capYear: number;
}

const AlertBanner = ({ exceededCount, approachingCount, capYear }: AlertBannerProps) => {
  if (exceededCount === 0 && approachingCount === 0) {
    return (
      <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
        <Typography variant="subtitle2">All Clear for FY {capYear}</Typography>
        <Typography variant="body2">
          No patients are currently approaching or exceeding the Medicare hospice cap.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
      {exceededCount > 0 && (
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="subtitle2">Cap Exceeded Alert</Typography>
          <Typography variant="body2">
            {exceededCount} patient{exceededCount > 1 ? 's have' : ' has'} exceeded the Medicare hospice cap.
            Immediate review required.
          </Typography>
        </Alert>
      )}
      {approachingCount > 0 && (
        <Alert severity="warning" icon={<WarningIcon />}>
          <Typography variant="subtitle2">Approaching Cap Warning</Typography>
          <Typography variant="body2">
            {approachingCount} patient{approachingCount > 1 ? 's are' : ' is'} approaching the cap threshold (80%+).
            Monitor closely.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

// ==============================|| CAP TRACKING DASHBOARD ||============================== //

const CapTrackingDashboard = () => {
  const [capYear, setCapYear] = useState(getCurrentCapYear());
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [metrics, setMetrics] = useState<CapMetrics | null>(null);
  const [report, setReport] = useState<CapUtilizationReport | null>(null);
  const [approachingPatients, setApproachingPatients] = useState<CapTrackingWithPatient[]>([]);
  const [exceededPatients, setExceededPatients] = useState<CapTrackingWithPatient[]>([]);
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);

  // Pagination state
  const [approachingPage, setApproachingPage] = useState(0);
  const [approachingRowsPerPage, setApproachingRowsPerPage] = useState(10);
  const [exceededPage, setExceededPage] = useState(0);
  const [exceededRowsPerPage, setExceededRowsPerPage] = useState(10);

  const capYearOptions = getCapYearOptions();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, reportRes, approachingRes, exceededRes, issuesRes] = await Promise.all([
        getCapMetrics({ cap_year: capYear }),
        getCapUtilizationReport({ cap_year: capYear }),
        getPatientsApproachingCap({ cap_year: capYear, threshold: 80 }),
        getCapExceededPatients({ cap_year: capYear }),
        getComplianceIssues({ category: 'CAP', status: 'OPEN' })
      ]);

      setMetrics(metricsRes.data);
      setReport(reportRes.data);
      setApproachingPatients(approachingRes.data || []);
      setExceededPatients(exceededRes.data || []);
      setComplianceIssues(issuesRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load cap tracking data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [capYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRecalculate = async () => {
    setRefreshing(true);
    try {
      await bulkRecalculateCaps({ cap_year: capYear });
      await fetchData();
    } catch (err) {
      console.error('Recalculation failed:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCapYearChange = (event: { target: { value: unknown } }) => {
    setCapYear(event.target.value as number);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Prepare chart data
  const distributionData: BarChartDataPoint[] = metrics
    ? [
        { label: '<50%', value: metrics.utilization_distribution.under_50, color: '#4caf50' },
        { label: '50-79%', value: metrics.utilization_distribution['50_to_79'], color: '#8bc34a' },
        { label: '80-89%', value: metrics.utilization_distribution['80_to_89'], color: '#ffc107' },
        { label: '90-99%', value: metrics.utilization_distribution['90_to_99'], color: '#ff9800' },
        { label: '100%+', value: metrics.utilization_distribution['100_plus'], color: '#f44336' }
      ]
    : [];

  const trendData: LineChartDataPoint[] = metrics?.trends.map((t) => ({
    label: t.date,
    value: parseFloat(t.average_utilization)
  })) || [];

  const statusDonutData = metrics
    ? [
        { label: 'Healthy', value: metrics.patients_healthy, color: '#4caf50' },
        { label: 'At Risk', value: metrics.patients_at_risk, color: '#ff9800' },
        { label: 'Exceeded', value: metrics.patients_exceeded, color: '#f44336' }
      ]
    : [];

  // Loading skeleton
  if (loading && !metrics) {
    return (
      <MainCard title="Cap Tracking Dashboard">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={60} />
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rectangular" height={140} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2}>
            {[1, 2].map((i) => (
              <Grid item xs={12} md={6} key={i}>
                <Skeleton variant="rectangular" height={300} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainCard>
    );
  }

  // Error state
  if (error) {
    return (
      <MainCard title="Cap Tracking Dashboard">
        <Alert
          severity="error"
          action={
            <IconButton color="inherit" size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Cap Tracking Dashboard"
      secondary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Cap Year</InputLabel>
            <Select value={capYear} onChange={handleCapYearChange} label="Cap Year">
              {capYearOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Tooltip title="Recalculate All Caps">
            <Button
              variant="outlined"
              size="small"
              onClick={handleRecalculate}
              disabled={refreshing}
              startIcon={<RefreshIcon />}
            >
              Recalculate
            </Button>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box>
        {/* Alert Banner */}
        <AlertBanner
          exceededCount={metrics?.patients_exceeded || 0}
          approachingCount={metrics?.patients_at_risk || 0}
          capYear={capYear}
        />

        {/* Key Metrics */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Patients"
              value={metrics?.total_patients || 0}
              subtitle="Active cap tracking records"
              icon={<PersonIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Average Utilization"
              value={`${metrics?.average_utilization || 0}%`}
              subtitle="Across all patients"
              icon={<AssessmentIcon />}
              color={
                parseFloat(metrics?.average_utilization || '0') >= 80
                  ? 'warning'
                  : 'success'
              }
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Patients At Risk"
              value={metrics?.patients_at_risk || 0}
              subtitle="80%+ utilization"
              icon={<WarningIcon />}
              color="warning"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Cap Exceeded"
              value={metrics?.patients_exceeded || 0}
              subtitle="Requires immediate review"
              icon={<ErrorIcon />}
              color={metrics?.patients_exceeded ? 'error' : 'success'}
            />
          </Grid>
        </Grid>

        {/* Financial Summary */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <MonetizationOnIcon color="primary" />
                  <Typography variant="h6">Total Cap Amount</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: 'primary.main' }}>
                  {formatCurrency(metrics?.total_cap_amount_cents || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  FY {capYear} Medicare cap allocation
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalanceWalletIcon color="warning" />
                  <Typography variant="h6">Total Payments</Typography>
                </Box>
                <Typography variant="h3" sx={{ color: 'warning.main' }}>
                  {formatCurrency(metrics?.total_payments_cents || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Applied to cap year
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon
                    color={parseFloat(metrics?.total_cap_utilization || '0') >= 80 ? 'error' : 'success'}
                  />
                  <Typography variant="h6">Overall Utilization</Typography>
                </Box>
                <SimpleGaugeChart
                  value={parseFloat(metrics?.total_cap_utilization || '0')}
                  size={140}
                  thickness={16}
                  label="Cap Used"
                  thresholds={{ warning: 80, critical: 50 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="cap tracking tabs">
            <Tab icon={<AssessmentIcon />} iconPosition="start" label="Overview" />
            <Tab
              icon={<WarningIcon />}
              iconPosition="start"
              label={`Approaching (${approachingPatients.length})`}
            />
            <Tab
              icon={<ErrorIcon />}
              iconPosition="start"
              label={`Exceeded (${exceededPatients.length})`}
            />
            <Tab
              icon={<NotificationsActiveIcon />}
              iconPosition="start"
              label={`Alerts (${complianceIssues.length})`}
            />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Distribution Chart */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Utilization Distribution
                  </Typography>
                  {distributionData.length > 0 ? (
                    <SimpleBarChart
                      data={distributionData}
                      height={250}
                      orientation="vertical"
                      formatValue={(v) => `${v} patients`}
                    />
                  ) : (
                    <Box
                      sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Typography color="text.secondary">No distribution data</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Status Donut */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Patient Status Breakdown
                  </Typography>
                  {statusDonutData.length > 0 ? (
                    <SimpleDonutChart
                      data={statusDonutData}
                      size={200}
                      thickness={40}
                      centerLabel="Total"
                      centerValue={metrics?.total_patients.toString()}
                    />
                  ) : (
                    <Box
                      sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Typography color="text.secondary">No status data</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Trend Chart */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Utilization Trend (Last 12 Months)
                  </Typography>
                  {trendData.length > 0 ? (
                    <SimpleLineChart
                      data={trendData}
                      height={250}
                      showArea
                      showDots
                      formatValue={(v) => `${v.toFixed(1)}%`}
                      primaryLabel="Avg Utilization"
                    />
                  ) : (
                    <Box
                      sx={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Typography color="text.secondary">
                        No historical trend data available
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Report Summary */}
            {report && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cap Year Summary
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Total Patients
                        </Typography>
                        <Typography variant="h5">{report.summary.total_patients}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Above 80%
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'warning.main' }}>
                          {report.summary.patients_above_80}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Above 90%
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'warning.dark' }}>
                          {report.summary.patients_above_90}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Above 95%
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'error.light' }}>
                          {report.summary.patients_above_95}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Exceeded
                        </Typography>
                        <Typography variant="h5" sx={{ color: 'error.main' }}>
                          {report.summary.patients_exceeded}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={4} md={2}>
                        <Typography variant="body2" color="text.secondary">
                          Avg Utilization
                        </Typography>
                        <Typography variant="h5">{report.summary.average_utilization}%</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Approaching Cap Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patients Approaching Cap (80%+ Utilization)
              </Typography>
              {approachingPatients.length > 0 ? (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Patient</TableCell>
                          <TableCell>MRN</TableCell>
                          <TableCell align="right">Cap Amount</TableCell>
                          <TableCell align="right">Payments</TableCell>
                          <TableCell align="right">Remaining</TableCell>
                          <TableCell align="center" sx={{ width: 180 }}>
                            Utilization
                          </TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {approachingPatients
                          .slice(
                            approachingPage * approachingRowsPerPage,
                            approachingPage * approachingRowsPerPage + approachingRowsPerPage
                          )
                          .map((record) => {
                            const status = getUtilizationStatus(record.cap.utilization_percentage);
                            return (
                              <TableRow key={record.cap.id} hover>
                                <TableCell>
                                  {record.patient.last_name}, {record.patient.first_name}
                                </TableCell>
                                <TableCell>{record.patient.medical_record_number}</TableCell>
                                <TableCell align="right">
                                  {formatCurrency(record.cap.cap_amount_cents)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(record.cap.total_payments_cents)}
                                </TableCell>
                                <TableCell align="right">
                                  {formatCurrency(record.cap.remaining_cap_cents)}
                                </TableCell>
                                <TableCell>
                                  <UtilizationProgress
                                    percentage={record.cap.utilization_percentage}
                                    showLabel={false}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      textAlign: 'center',
                                      color: getUtilizationColor(record.cap.utilization_percentage)
                                    }}
                                  >
                                    {record.cap.utilization_percentage.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={status.toUpperCase()}
                                    size="small"
                                    color={getStatusColor(status)}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={approachingPatients.length}
                    page={approachingPage}
                    onPageChange={(_, page) => setApproachingPage(page)}
                    rowsPerPage={approachingRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setApproachingRowsPerPage(parseInt(e.target.value, 10));
                      setApproachingPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                </>
              ) : (
                <Alert severity="success" sx={{ mt: 2 }}>
                  No patients are currently approaching the cap threshold.
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Exceeded Cap Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
                Patients Exceeding Cap
              </Typography>
              {exceededPatients.length > 0 ? (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Patient</TableCell>
                          <TableCell>MRN</TableCell>
                          <TableCell align="right">Cap Amount</TableCell>
                          <TableCell align="right">Total Payments</TableCell>
                          <TableCell align="right" sx={{ color: 'error.main' }}>
                            Amount Over Cap
                          </TableCell>
                          <TableCell align="center">Exceeded Date</TableCell>
                          <TableCell>Utilization</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {exceededPatients
                          .slice(
                            exceededPage * exceededRowsPerPage,
                            exceededPage * exceededRowsPerPage + exceededRowsPerPage
                          )
                          .map((record) => (
                            <TableRow key={record.cap.id} hover sx={{ bgcolor: 'error.lighter' }}>
                              <TableCell>
                                {record.patient.last_name}, {record.patient.first_name}
                              </TableCell>
                              <TableCell>{record.patient.medical_record_number}</TableCell>
                              <TableCell align="right">
                                {formatCurrency(record.cap.cap_amount_cents)}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(record.cap.total_payments_cents)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: 'error.main', fontWeight: 600 }}>
                                {formatCurrency(record.cap.cap_exceeded_amount_cents || 0)}
                              </TableCell>
                              <TableCell align="center">
                                {record.cap.cap_exceeded_date
                                  ? new Date(record.cap.cap_exceeded_date).toLocaleDateString()
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={`${record.cap.utilization_percentage.toFixed(1)}%`}
                                  size="small"
                                  color="error"
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={exceededPatients.length}
                    page={exceededPage}
                    onPageChange={(_, page) => setExceededPage(page)}
                    rowsPerPage={exceededRowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setExceededRowsPerPage(parseInt(e.target.value, 10));
                      setExceededPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                  />
                </>
              ) : (
                <Alert severity="success" sx={{ mt: 2 }}>
                  No patients have exceeded the Medicare hospice cap.
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Alerts Tab */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Compliance Issues
              </Typography>
              {complianceIssues.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Issue</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Severity</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Due Date</TableCell>
                        <TableCell>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {complianceIssues.map((issue) => (
                        <TableRow key={issue.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {issue.title}
                            </Typography>
                            {issue.description && (
                              <Typography variant="caption" color="text.secondary">
                                {issue.description}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip label={issue.issue_type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.severity}
                              size="small"
                              color={getSeverityColor(issue.severity)}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={issue.status}
                              size="small"
                              variant="outlined"
                              color={issue.status === 'OPEN' ? 'error' : 'primary'}
                            />
                          </TableCell>
                          <TableCell>
                            {issue.due_date
                              ? new Date(issue.due_date).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(issue.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="success" sx={{ mt: 2 }}>
                  No active cap-related compliance issues.
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabPanel>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Cap Year: FY {capYear} (Oct {capYear - 1} - Sep {capYear}) |
            Medicare Hospice Cap: $34,465.34 per beneficiary
          </Typography>
        </Box>
      </Box>
    </MainCard>
  );
};

export default CapTrackingDashboard;
