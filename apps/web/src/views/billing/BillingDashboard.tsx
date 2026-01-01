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
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SendIcon from '@mui/icons-material/Send';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Project Imports
import MainCard from 'components/MainCard';
import {
  getClaims,
  getClaimById,
  getBillingDashboard,
  getARAgingReport,
  exportClaimsToCSV,
  formatCurrency,
  getClaimStatusColor,
  getClaimStatusLabel,
  getPatientName,
  getDaysSince,
  type Claim,
  type ClaimDetail,
  type ClaimStatus,
  type Patient,
  type Payer,
  type BillingDashboard as BillingDashboardType,
  type ARAgingReport
} from 'api/billing';

// ==============================|| PERIOD OPTIONS ||============================== //

const PERIOD_OPTIONS = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_quarter', label: 'Current Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' }
];

const CLAIM_STATUS_OPTIONS: ClaimStatus[] = [
  'DRAFT',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'ACCEPTED',
  'REJECTED',
  'PAID',
  'DENIED',
  'APPEALED',
  'VOID'
];

// Status steps for timeline visualization
const CLAIM_STATUS_STEPS = ['DRAFT', 'SUBMITTED', 'ACCEPTED', 'PAID'];

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

// ==============================|| ACTION REQUIRED CARD ||============================== //

interface ActionRequiredProps {
  readyToSubmit: number;
  rejectedClaims: number;
  deniedClaims: number;
  unbilledPeriods: number;
  onViewClick: (type: string) => void;
}

const ActionRequiredCard = ({ readyToSubmit, rejectedClaims, deniedClaims, unbilledPeriods, onViewClick }: ActionRequiredProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Action Required</Typography>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            bgcolor: 'primary.lighter',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.light' }
          }}
          onClick={() => onViewClick('ready_to_submit')}
        >
          <Box>
            <Typography variant="subtitle2">Ready to Submit</Typography>
            <Typography variant="caption" color="text.secondary">Claims pending submission</Typography>
          </Box>
          <Chip label={readyToSubmit} color="primary" size="small" />
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            bgcolor: 'error.lighter',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'error.light' }
          }}
          onClick={() => onViewClick('rejected')}
        >
          <Box>
            <Typography variant="subtitle2">Rejected Claims</Typography>
            <Typography variant="caption" color="text.secondary">Need correction and resubmission</Typography>
          </Box>
          <Chip label={rejectedClaims} color="error" size="small" />
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            bgcolor: 'warning.lighter',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'warning.light' }
          }}
          onClick={() => onViewClick('denied')}
        >
          <Box>
            <Typography variant="subtitle2">Denied Claims</Typography>
            <Typography variant="caption" color="text.secondary">May require appeal</Typography>
          </Box>
          <Chip label={deniedClaims} color="warning" size="small" />
        </Box>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            bgcolor: 'info.lighter',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'info.light' }
          }}
          onClick={() => onViewClick('unbilled')}
        >
          <Box>
            <Typography variant="subtitle2">Unbilled Periods</Typography>
            <Typography variant="caption" color="text.secondary">Ready to bill</Typography>
          </Box>
          <Chip label={unbilledPeriods} color="info" size="small" />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ==============================|| AR AGING CHART ||============================== //

interface ARAgingChartProps {
  arAging: Array<{
    bucket: string;
    claim_count: number;
    total_amount: number;
    total_amount_formatted: string;
    percentage: number;
  }>;
}

const ARAgingChart = ({ arAging }: ARAgingChartProps) => {
  const getBucketColor = (bucket: string) => {
    if (bucket.includes('Current') || bucket.includes('0-30')) return 'success';
    if (bucket.includes('31-60')) return 'info';
    if (bucket.includes('61-90')) return 'warning';
    return 'error';
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>AR Aging</Typography>
        <Box sx={{ mt: 2 }}>
          {arAging.map((bucket) => (
            <Box key={bucket.bucket} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{bucket.bucket}</Typography>
                <Typography variant="body2" fontWeight={500}>
                  {bucket.total_amount_formatted} ({bucket.claim_count} claims)
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={bucket.percentage}
                color={getBucketColor(bucket.bucket)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

// ==============================|| CLAIMS BY STATUS TABLE ||============================== //

interface ClaimsByStatusTableProps {
  claimsByStatus: Array<{
    status: ClaimStatus;
    count: number;
    amount: number;
    amount_formatted: string;
  }>;
  onStatusClick: (status: ClaimStatus) => void;
}

const ClaimsByStatusTable = ({ claimsByStatus, onStatusClick }: ClaimsByStatusTableProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Claims by Status</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {claimsByStatus.map((row) => (
              <TableRow
                key={row.status}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onStatusClick(row.status)}
              >
                <TableCell>
                  <Chip
                    label={getClaimStatusLabel(row.status)}
                    size="small"
                    color={getClaimStatusColor(row.status)}
                  />
                </TableCell>
                <TableCell align="right">{row.count}</TableCell>
                <TableCell align="right">{row.amount_formatted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

// ==============================|| TOP PAYERS TABLE ||============================== //

interface TopPayersTableProps {
  payers: Array<{
    payer_id: number;
    payer_name: string;
    claim_count: number;
    total_billed: number;
    total_paid: number;
    collection_rate: number;
  }>;
}

const TopPayersTable = ({ payers }: TopPayersTableProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Top Payers</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Payer</TableCell>
              <TableCell align="right">Claims</TableCell>
              <TableCell align="right">Billed</TableCell>
              <TableCell align="right">Collection Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payers.slice(0, 5).map((payer) => (
              <TableRow key={payer.payer_id}>
                <TableCell>{payer.payer_name}</TableCell>
                <TableCell align="right">{payer.claim_count}</TableCell>
                <TableCell align="right">{formatCurrency(payer.total_billed)}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${payer.collection_rate.toFixed(1)}%`}
                    size="small"
                    color={payer.collection_rate >= 90 ? 'success' : payer.collection_rate >= 70 ? 'warning' : 'error'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </CardContent>
  </Card>
);

// ==============================|| CLAIMS LIST ||============================== //

interface ClaimsListProps {
  onClaimClick: (claim: Claim) => void;
  initialStatusFilter?: ClaimStatus;
}

const ClaimsList = ({ onClaimClick, initialStatusFilter }: ClaimsListProps) => {
  const [claims, setClaims] = useState<Array<{ claim: Claim; patient: Patient; payer: Payer }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | ''>(initialStatusFilter || '');
  const [orderBy, setOrderBy] = useState<string>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getClaims(
        {
          status: statusFilter || undefined,
          search: searchTerm || undefined
        },
        {
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          sort_by: orderBy,
          sort_order: order
        }
      );
      setClaims(response.data);
      setTotalCount(response.total || response.data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, orderBy, order]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleExport = async () => {
    try {
      const blob = await exportClaimsToCSV({
        status: statusFilter || undefined,
        search: searchTerm || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `claims-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchClaims}>
          <RefreshIcon />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search claims..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | '')}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            {CLAIM_STATUS_OPTIONS.map((status) => (
              <MenuItem key={status} value={status}>
                {getClaimStatusLabel(status)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          startIcon={<FileDownloadIcon />}
          onClick={handleExport}
          disabled={loading}
        >
          Export CSV
        </Button>
      </Stack>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'claim_number'}
                    direction={orderBy === 'claim_number' ? order : 'asc'}
                    onClick={() => handleSort('claim_number')}
                  >
                    Claim #
                  </TableSortLabel>
                </TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Payer</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'service_start_date'}
                    direction={orderBy === 'service_start_date' ? order : 'asc'}
                    onClick={() => handleSort('service_start_date')}
                  >
                    Service Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'claim_status'}
                    direction={orderBy === 'claim_status' ? order : 'asc'}
                    onClick={() => handleSort('claim_status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'total_charges'}
                    direction={orderBy === 'total_charges' ? order : 'asc'}
                    onClick={() => handleSort('total_charges')}
                  >
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : claims.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No claims found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                claims.map(({ claim, patient, payer }) => (
                  <TableRow
                    key={claim.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => onClaimClick(claim)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {claim.claim_number}
                      </Typography>
                    </TableCell>
                    <TableCell>{getPatientName(patient)}</TableCell>
                    <TableCell>{payer?.payer_name || '-'}</TableCell>
                    <TableCell>
                      {claim.service_start_date ? new Date(claim.service_start_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getClaimStatusLabel(claim.claim_status)}
                        size="small"
                        color={getClaimStatusColor(claim.claim_status)}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(claim.total_charges)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color={claim.balance > 0 ? 'error.main' : 'success.main'}
                      >
                        {formatCurrency(claim.balance)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onClaimClick(claim); }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
};

// ==============================|| CLAIM DETAIL DIALOG ||============================== //

interface ClaimDetailDialogProps {
  claim: Claim | null;
  open: boolean;
  onClose: () => void;
}

const ClaimDetailDialog = ({ claim, open, onClose }: ClaimDetailDialogProps) => {
  const [claimDetail, setClaimDetail] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (claim && open) {
      setLoading(true);
      getClaimById(claim.id)
        .then(setClaimDetail)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [claim, open]);

  const getStatusStepIndex = (status: ClaimStatus): number => {
    const normalizedSteps = CLAIM_STATUS_STEPS;
    const index = normalizedSteps.indexOf(status);
    if (index >= 0) return index;
    // Map other statuses
    if (status === 'READY_TO_SUBMIT') return 0;
    if (status === 'REJECTED' || status === 'DENIED' || status === 'APPEALED') return 2;
    if (status === 'VOID') return -1;
    return 0;
  };

  if (!claim) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Claim Details - {claim.claim_number}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            {/* Status Timeline */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Claim Status
              </Typography>
              <Stepper activeStep={getStatusStepIndex(claim.claim_status)} alternativeLabel>
                {CLAIM_STATUS_STEPS.map((status) => (
                  <Step key={status}>
                    <StepLabel
                      error={claim.claim_status === 'REJECTED' || claim.claim_status === 'DENIED'}
                    >
                      {getClaimStatusLabel(status as ClaimStatus)}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              {(claim.claim_status === 'REJECTED' || claim.claim_status === 'DENIED' || claim.claim_status === 'APPEALED') && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Current Status: {getClaimStatusLabel(claim.claim_status)}
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={3}>
              {/* Patient Information */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Patient Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Patient Name</Typography>
                    <Typography>{getPatientName(claimDetail?.patient)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">MRN</Typography>
                    <Typography>{claimDetail?.patient?.medical_record_number || '-'}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Insurance Details */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Insurance Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Payer</Typography>
                    <Typography>{claimDetail?.payer?.payer_name || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Payer Type</Typography>
                    <Typography>{claimDetail?.payer?.payer_type || '-'}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Claim Details */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Claim Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Claim Type</Typography>
                    <Typography>{claim.claim_type}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Bill Type</Typography>
                    <Typography>{claim.bill_type || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Service Start</Typography>
                    <Typography>
                      {claim.service_start_date ? new Date(claim.service_start_date).toLocaleDateString() : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Service End</Typography>
                    <Typography>
                      {claim.service_end_date ? new Date(claim.service_end_date).toLocaleDateString() : '-'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Principal Diagnosis</Typography>
                    <Typography>{claim.principal_diagnosis_code || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Attending Physician</Typography>
                    <Typography>{claim.attending_physician_name || '-'}</Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Financial Summary */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Financial Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Total Charges</Typography>
                    <Typography variant="h6">{formatCurrency(claim.total_charges)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Total Paid</Typography>
                    <Typography variant="h6" color="success.main">{formatCurrency(claim.total_paid)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Adjustments</Typography>
                    <Typography variant="h6">{formatCurrency(claim.total_adjustments)}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">Balance</Typography>
                    <Typography
                      variant="h6"
                      color={claim.balance > 0 ? 'error.main' : 'success.main'}
                    >
                      {formatCurrency(claim.balance)}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              {/* Service Lines */}
              {claimDetail?.service_lines && claimDetail.service_lines.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Service Lines
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Line #</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Revenue Code</TableCell>
                          <TableCell>HCPCS</TableCell>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Units</TableCell>
                          <TableCell align="right">Charges</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {claimDetail.service_lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell>{line.line_number}</TableCell>
                            <TableCell>
                              {line.service_date ? new Date(line.service_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>{line.revenue_code}</TableCell>
                            <TableCell>{line.hcpcs_code || '-'}</TableCell>
                            <TableCell>{line.description || line.level_of_care || '-'}</TableCell>
                            <TableCell align="right">{line.units}</TableCell>
                            <TableCell align="right">{formatCurrency(line.charges)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {/* Payment History */}
              {claimDetail?.payments_applied && claimDetail.payments_applied.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Payment History
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Payment #</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Method</TableCell>
                          <TableCell align="right">Applied</TableCell>
                          <TableCell align="right">Adjustment</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {claimDetail.payments_applied.map(({ application, payment }) => (
                          <TableRow key={application.id}>
                            <TableCell>{payment.payment_number}</TableCell>
                            <TableCell>
                              {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>{payment.payment_method}</TableCell>
                            <TableCell align="right" sx={{ color: 'success.main' }}>
                              {formatCurrency(application.applied_amount)}
                            </TableCell>
                            <TableCell align="right">
                              {formatCurrency(application.adjustment_amount)}
                            </TableCell>
                            <TableCell>{application.adjustment_reason || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              )}

              {/* Notes */}
              {claim.notes && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Notes
                  </Typography>
                  <Typography variant="body2">{claim.notes}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {claim.claim_status === 'READY_TO_SUBMIT' && (
          <Button variant="contained" color="primary" startIcon={<SendIcon />}>
            Submit Claim
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| MAIN DASHBOARD ||============================== //

const BillingDashboard = () => {
  const [period, setPeriod] = useState('current_month');
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<BillingDashboardType | null>(null);
  const [arAging, setArAging] = useState<ARAgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<ClaimStatus | undefined>(undefined);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, arAgingData] = await Promise.all([
        getBillingDashboard(period),
        getARAgingReport()
      ]);
      setDashboard(dashboardData);
      setArAging(arAgingData);
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

  const handleActionClick = (type: string) => {
    setTabValue(1); // Switch to claims tab
    switch (type) {
      case 'ready_to_submit':
        setClaimsStatusFilter('READY_TO_SUBMIT');
        break;
      case 'rejected':
        setClaimsStatusFilter('REJECTED');
        break;
      case 'denied':
        setClaimsStatusFilter('DENIED');
        break;
      default:
        setClaimsStatusFilter(undefined);
    }
  };

  const handleStatusClick = (status: ClaimStatus) => {
    setTabValue(1);
    setClaimsStatusFilter(status);
  };

  const handleClaimClick = (claim: Claim) => {
    setSelectedClaim(claim);
  };

  if (loading && !dashboard) {
    return (
      <MainCard title="Billing Dashboard">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Skeleton variant="rectangular" height={60} />
          <Grid container spacing={2}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
                <Skeleton variant="rectangular" height={140} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </MainCard>
    );
  }

  if (error && !dashboard) {
    return (
      <MainCard title="Billing Dashboard">
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

  // Default mock data for when API hasn't returned data yet
  const mockDashboard: BillingDashboardType = dashboard || {
    period: { label: 'Current Month', start: '', end: '' },
    kpis: {
      total_claims: 0,
      total_revenue: 0,
      total_revenue_formatted: '$0.00',
      total_payments: 0,
      total_payments_formatted: '$0.00',
      total_outstanding: 0,
      total_outstanding_formatted: '$0.00',
      collection_rate: 0,
      clean_claim_rate: 0,
      denial_rate: 0,
      avg_days_to_payment: 0,
      claims_by_status: []
    },
    trends: {
      revenue_trend: 'stable',
      revenue_change: 0,
      collection_trend: 'stable',
      collection_change: 0
    },
    ar_aging: [],
    top_payers: [],
    recent_activity: [],
    action_required: {
      ready_to_submit: 0,
      rejected_claims: 0,
      denied_claims: 0,
      unbilled_periods: 0
    },
    generated_at: new Date().toISOString()
  };

  return (
    <MainCard
      title="Billing Dashboard"
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
        {mockDashboard.period && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {mockDashboard.period.label}: {mockDashboard.period.start} to {mockDashboard.period.end}
          </Typography>
        )}

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Overview" icon={<AssessmentIcon />} iconPosition="start" />
            <Tab label="Claims" icon={<ReceiptLongIcon />} iconPosition="start" />
            <Tab label="Payments" icon={<PaymentsIcon />} iconPosition="start" />
            <Tab label="AR Aging" icon={<AccountBalanceWalletIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <>
            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Total Claims"
                  value={mockDashboard.kpis.total_claims}
                  icon={<ReceiptLongIcon color="primary" />}
                  color="primary"
                  onClick={() => handleStatusClick('SUBMITTED')}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Total Revenue"
                  value={mockDashboard.kpis.total_revenue_formatted}
                  icon={<AssessmentIcon color="info" />}
                  color="info"
                  trend={mockDashboard.trends ? {
                    direction: mockDashboard.trends.revenue_trend,
                    change: mockDashboard.trends.revenue_change
                  } : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Payments Received"
                  value={mockDashboard.kpis.total_payments_formatted}
                  icon={<PaymentsIcon color="success" />}
                  color="success"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Outstanding AR"
                  value={mockDashboard.kpis.total_outstanding_formatted}
                  icon={<AccountBalanceWalletIcon color="warning" />}
                  color="warning"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Collection Rate"
                  value={`${mockDashboard.kpis.collection_rate.toFixed(1)}%`}
                  subtitle="Of billed amount collected"
                  color={mockDashboard.kpis.collection_rate >= 90 ? 'success' : mockDashboard.kpis.collection_rate >= 70 ? 'warning' : 'error'}
                  trend={mockDashboard.trends ? {
                    direction: mockDashboard.trends.collection_trend,
                    change: mockDashboard.trends.collection_change
                  } : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Clean Claim Rate"
                  value={`${mockDashboard.kpis.clean_claim_rate.toFixed(1)}%`}
                  subtitle="First-pass acceptance"
                  color={mockDashboard.kpis.clean_claim_rate >= 95 ? 'success' : mockDashboard.kpis.clean_claim_rate >= 85 ? 'warning' : 'error'}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Details Grid */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <ActionRequiredCard
                  readyToSubmit={mockDashboard.action_required.ready_to_submit}
                  rejectedClaims={mockDashboard.action_required.rejected_claims}
                  deniedClaims={mockDashboard.action_required.denied_claims}
                  unbilledPeriods={mockDashboard.action_required.unbilled_periods}
                  onViewClick={handleActionClick}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <ClaimsByStatusTable
                  claimsByStatus={mockDashboard.kpis.claims_by_status}
                  onStatusClick={handleStatusClick}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TopPayersTable payers={mockDashboard.top_payers} />
              </Grid>
              <Grid item xs={12}>
                <ARAgingChart arAging={arAging?.buckets || mockDashboard.ar_aging} />
              </Grid>
            </Grid>
          </>
        )}

        {/* Claims Tab */}
        {tabValue === 1 && (
          <ClaimsList
            onClaimClick={handleClaimClick}
            initialStatusFilter={claimsStatusFilter}
          />
        )}

        {/* Payments Tab */}
        {tabValue === 2 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Payments view - Coming soon
            </Typography>
          </Box>
        )}

        {/* AR Aging Tab */}
        {tabValue === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <ARAgingChart arAging={arAging?.buckets || mockDashboard.ar_aging} />
            </Grid>
            {arAging?.by_payer && arAging.by_payer.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>AR Aging by Payer</Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Payer</TableCell>
                            <TableCell align="right">Current</TableCell>
                            <TableCell align="right">31-60 Days</TableCell>
                            <TableCell align="right">61-90 Days</TableCell>
                            <TableCell align="right">90+ Days</TableCell>
                            <TableCell align="right">Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {arAging.by_payer.map((payer) => (
                            <TableRow key={payer.payer_id}>
                              <TableCell>{payer.payer_name}</TableCell>
                              <TableCell align="right">{formatCurrency(payer.current)}</TableCell>
                              <TableCell align="right">{formatCurrency(payer.days_31_60)}</TableCell>
                              <TableCell align="right">{formatCurrency(payer.days_61_90)}</TableCell>
                              <TableCell align="right" sx={{ color: 'error.main' }}>
                                {formatCurrency(payer.over_90)}
                              </TableCell>
                              <TableCell align="right" fontWeight={500}>
                                {payer.total_formatted}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {mockDashboard.generated_at ? new Date(mockDashboard.generated_at).toLocaleString() : 'N/A'}
          </Typography>
        </Box>
      </Box>

      {/* Claim Detail Dialog */}
      <ClaimDetailDialog
        claim={selectedClaim}
        open={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
      />
    </MainCard>
  );
};

export default BillingDashboard;
