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
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Project Imports
import MainCard from 'components/MainCard';
import {
  getExecutiveDashboard,
  PERIOD_OPTIONS,
  ExecutiveDashboard,
  KPI,
  DashboardAlert,
  getStatusColor
} from 'api/analytics';

// ==============================|| KPI CARD ||============================== //

interface KPICardProps {
  kpi: KPI;
}

const KPICard = ({ kpi }: KPICardProps) => {
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
    <Card sx={{ height: '100%' }}>
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

// ==============================|| AR AGING CHART ||============================== //

interface ARAgingChartProps {
  arAging: ExecutiveDashboard['financial']['ar_aging'];
}

const ARAgingChart = ({ arAging }: ARAgingChartProps) => {
  const total = arAging.total || 1;
  const buckets = [
    { label: '0-30 Days', value: arAging.current, color: 'success.main' },
    { label: '31-60 Days', value: arAging.aging_31_60, color: 'info.main' },
    { label: '61-90 Days', value: arAging.aging_61_90, color: 'warning.main' },
    { label: '90+ Days', value: arAging.aging_over_90, color: 'error.main' }
  ];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>AR Aging Distribution</Typography>
      {buckets.map((bucket) => (
        <Box key={bucket.label} sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">{bucket.label}</Typography>
            <Typography variant="body2">
              ${(bucket.value / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(bucket.value / total) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                bgcolor: bucket.color,
                borderRadius: 4
              }
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

// ==============================|| CLAIMS BY STATUS ||============================== //

interface ClaimsByStatusProps {
  claimsByStatus: ExecutiveDashboard['operational']['claims_by_status'];
}

const ClaimsByStatus = ({ claimsByStatus }: ClaimsByStatusProps) => {
  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return 'success';
      case 'SUBMITTED':
      case 'ACCEPTED':
        return 'info';
      case 'PENDING':
      case 'DRAFT':
        return 'warning';
      case 'DENIED':
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>Claims by Status</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {claimsByStatus.map((item) => (
          <Chip
            key={item.status}
            label={`${item.status}: ${item.count}`}
            size="small"
            color={getStatusColor(item.status) as any}
            variant="outlined"
          />
        ))}
      </Box>
    </Box>
  );
};

// ==============================|| ANALYTICS DASHBOARD ||============================== //

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('current_month');
  const [dashboard, setDashboard] = useState<ExecutiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getExecutiveDashboard(period, true);
      setDashboard(data);
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

        {/* KPIs */}
        <Typography variant="h6" gutterBottom>Key Performance Indicators</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {dashboard?.kpis.map((kpi) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.id}>
              <KPICard kpi={kpi} />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Financial & Clinical Summary */}
        <Grid container spacing={3}>
          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Financial Summary</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Charges</Typography>
                    <Typography variant="h6">{dashboard?.financial.total_charges_formatted}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Payments</Typography>
                    <Typography variant="h6">{dashboard?.financial.total_payments_formatted}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Net Collection Rate</Typography>
                    <Typography variant="h6">{dashboard?.financial.net_collection_rate}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Avg Days to Payment</Typography>
                    <Typography variant="h6">{dashboard?.financial.avg_days_to_payment} days</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                {dashboard?.financial.ar_aging && (
                  <ARAgingChart arAging={dashboard.financial.ar_aging} />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Clinical Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Clinical Summary</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Active Patients</Typography>
                    <Typography variant="h6">{dashboard?.clinical.active_patients}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Total Encounters</Typography>
                    <Typography variant="h6">{dashboard?.clinical.total_encounters}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                    <Typography variant="h6">{dashboard?.clinical.encounter_completion_rate}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Avg Duration</Typography>
                    <Typography variant="h6">{dashboard?.clinical.avg_encounter_duration} min</Typography>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Encounters by Discipline</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {dashboard?.clinical.by_discipline?.map((item) => (
                    <Chip
                      key={item.discipline}
                      label={`${item.discipline}: ${item.count}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Operational Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Operational Summary</Typography>
                {dashboard?.operational.claims_by_status && (
                  <ClaimsByStatus claimsByStatus={dashboard.operational.claims_by_status} />
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>Top Payers by Volume</Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {dashboard?.operational.claims_by_payer?.slice(0, 5).map((payer) => (
                    <Box key={payer.payer_id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2">{payer.payer_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {payer.claim_count} claims ({payer.collection_rate}%)
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Compliance Summary */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Compliance Summary</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Claims Audited</Typography>
                    <Typography variant="h6">{dashboard?.compliance.total_claims_audited}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Compliance Score</Typography>
                    <Typography variant="h6">{dashboard?.compliance.compliance_score}%</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Scrubbing Pass Rate</Typography>
                    <Typography variant="h6" sx={{ color: 'success.main' }}>
                      {dashboard?.compliance.scrubbing_pass_rate}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Pending Audit</Typography>
                    <Typography variant="h6">{dashboard?.compliance.pending_audit}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Overall Compliance
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={dashboard?.compliance.compliance_score || 0}
                    color={
                      (dashboard?.compliance.compliance_score || 0) >= 95 ? 'success' :
                      (dashboard?.compliance.compliance_score || 0) >= 85 ? 'warning' : 'error'
                    }
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString() : 'N/A'}
          </Typography>
        </Box>
      </Box>
    </MainCard>
  );
};

export default AnalyticsDashboard;
