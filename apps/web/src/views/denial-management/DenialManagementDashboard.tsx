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

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GavelIcon from '@mui/icons-material/Gavel';

// Project Imports
import MainCard from 'components/MainCard';
import {
  getDenialDashboard,
  getDenials,
  getDenialTrends,
  getAppeals,
  exportDenialsToCSV,
  formatCurrency,
  getDenialStatusColor,
  getAppealStatusColor,
  getPriorityColor,
  formatStatus,
  getDaysToDeadline,
  getUrgencyLevel,
  type Denial,
  type Appeal,
  type DenialDashboard,
  type DenialTrend,
  type TopDenialReason,
  type DenialStatus,
  type PriorityLevel
} from 'api/denialManagement';

// ==============================|| PERIOD OPTIONS ||============================== //

const PERIOD_OPTIONS = [
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'current_quarter', label: 'Current Quarter' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_90_days', label: 'Last 90 Days' }
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
}

const KPICard = ({ title, value, subtitle, trend, color = 'primary', icon }: KPICardProps) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'increasing':
        return <TrendingUpIcon sx={{ color: trend.change > 0 ? 'success.main' : 'error.main', fontSize: 20 }} />;
      case 'decreasing':
        return <TrendingDownIcon sx={{ color: trend.change < 0 ? 'success.main' : 'error.main', fontSize: 20 }} />;
      default:
        return <TrendingFlatIcon sx={{ color: 'text.secondary', fontSize: 20 }} />;
    }
  };

  return (
    <Card sx={{ height: '100%' }}>
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
                  (trend.change > 0 ? 'error.main' : 'success.main')
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
  pendingReview: number;
  expiringDeadlines: number;
  awaitingDecision: number;
  onViewClick: (type: string) => void;
}

const ActionRequiredCard = ({ pendingReview, expiringDeadlines, awaitingDecision, onViewClick }: ActionRequiredProps) => (
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
            bgcolor: 'warning.lighter',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'warning.light' }
          }}
          onClick={() => onViewClick('pending_review')}
        >
          <Box>
            <Typography variant="subtitle2">Pending Review</Typography>
            <Typography variant="caption" color="text.secondary">Denials awaiting assessment</Typography>
          </Box>
          <Chip label={pendingReview} color="warning" size="small" />
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
          onClick={() => onViewClick('expiring')}
        >
          <Box>
            <Typography variant="subtitle2">Expiring Deadlines</Typography>
            <Typography variant="caption" color="text.secondary">Appeal deadlines within 14 days</Typography>
          </Box>
          <Chip label={expiringDeadlines} color="error" size="small" />
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
          onClick={() => onViewClick('awaiting_decision')}
        >
          <Box>
            <Typography variant="subtitle2">Awaiting Decision</Typography>
            <Typography variant="caption" color="text.secondary">Submitted appeals pending response</Typography>
          </Box>
          <Chip label={awaitingDecision} color="info" size="small" />
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ==============================|| TOP REASONS TABLE ||============================== //

interface TopReasonsTableProps {
  reasons: TopDenialReason[];
}

const TopReasonsTable = ({ reasons }: TopReasonsTableProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Top Denial Reasons</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>CARC Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Count</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Appeal Success</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reasons.slice(0, 5).map((reason) => (
              <TableRow key={reason.carc_code}>
                <TableCell>
                  <Chip label={reason.carc_code} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Tooltip title={reason.description}>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {reason.description}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">{reason.count}</TableCell>
                <TableCell align="right">{reason.total_amount_formatted}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${reason.avg_appeal_success_rate}%`}
                    size="small"
                    color={reason.avg_appeal_success_rate >= 60 ? 'success' : reason.avg_appeal_success_rate >= 40 ? 'warning' : 'error'}
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

// ==============================|| TOP PAYERS TABLE ||============================== //

interface TopPayersTableProps {
  payers: DenialDashboard['top_payers'];
}

const TopPayersTable = ({ payers }: TopPayersTableProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>Top Denying Payers</Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Payer</TableCell>
              <TableCell align="right">Denials</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Denial Rate</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payers.slice(0, 5).map((payer) => (
              <TableRow key={payer.payer_id}>
                <TableCell>{payer.payer_name}</TableCell>
                <TableCell align="right">{payer.denial_count}</TableCell>
                <TableCell align="right">{formatCurrency(payer.denial_amount)}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${payer.denial_rate.toFixed(1)}%`}
                    size="small"
                    color={payer.denial_rate <= 5 ? 'success' : payer.denial_rate <= 10 ? 'warning' : 'error'}
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

// ==============================|| DENIALS LIST TAB ||============================== //

interface DenialsListProps {
  onDenialClick: (denial: Denial) => void;
}

const DenialsList = ({ onDenialClick }: DenialsListProps) => {
  const [denials, setDenials] = useState<Denial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DenialStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityLevel | ''>('');
  const [orderBy, setOrderBy] = useState<string>('priority_score');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchDenials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDenials(
        {
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          search: searchTerm || undefined
        },
        {
          page: page + 1,
          page_size: rowsPerPage,
          sort_by: orderBy,
          sort_order: order
        }
      );
      setDenials(response.data);
      setTotalCount(response.pagination?.total || response.data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load denials');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, priorityFilter, orderBy, order]);

  useEffect(() => {
    fetchDenials();
  }, [fetchDenials]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleExport = async () => {
    try {
      const blob = await exportDenialsToCSV({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: searchTerm || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `denials-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchDenials}>
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
            onChange={(e) => setStatusFilter(e.target.value as DenialStatus | '')}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="IDENTIFIED">Identified</MenuItem>
            <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
            <MenuItem value="APPROVED_FOR_APPEAL">Approved for Appeal</MenuItem>
            <MenuItem value="APPEALING">Appealing</MenuItem>
            <MenuItem value="APPEAL_WON">Appeal Won</MenuItem>
            <MenuItem value="APPEAL_LOST">Appeal Lost</MenuItem>
            <MenuItem value="WRITTEN_OFF">Written Off</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityLevel | '')}
            label="Priority"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
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
                    active={orderBy === 'denial_status'}
                    direction={orderBy === 'denial_status' ? order : 'asc'}
                    onClick={() => handleSort('denial_status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'denied_amount'}
                    direction={orderBy === 'denied_amount' ? order : 'asc'}
                    onClick={() => handleSort('denied_amount')}
                  >
                    Denied Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'priority_score'}
                    direction={orderBy === 'priority_score' ? order : 'asc'}
                    onClick={() => handleSort('priority_score')}
                  >
                    Priority
                  </TableSortLabel>
                </TableCell>
                <TableCell>Appeal Deadline</TableCell>
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
              ) : denials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No denials found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                denials.map((denial) => {
                  const daysToDeadline = denial.appeal_deadline ? getDaysToDeadline(denial.appeal_deadline) : null;
                  const urgency = daysToDeadline !== null ? getUrgencyLevel(daysToDeadline) : 'normal';

                  return (
                    <TableRow
                      key={denial.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => onDenialClick(denial)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {denial.claim_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{denial.patient_name || '-'}</TableCell>
                      <TableCell>{denial.payer_name || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={formatStatus(denial.denial_status)}
                          size="small"
                          color={getDenialStatusColor(denial.denial_status) as any}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={500}>
                          {denial.denied_amount_formatted || formatCurrency(denial.denied_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={denial.priority_level}
                          size="small"
                          color={getPriorityColor(denial.priority_level) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {denial.appeal_deadline ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {urgency === 'critical' && <ErrorIcon color="error" fontSize="small" />}
                            {urgency === 'warning' && <WarningIcon color="warning" fontSize="small" />}
                            <Typography
                              variant="body2"
                              color={urgency === 'critical' ? 'error.main' : urgency === 'warning' ? 'warning.main' : 'text.primary'}
                            >
                              {new Date(denial.appeal_deadline).toLocaleDateString()}
                              {daysToDeadline !== null && ` (${daysToDeadline}d)`}
                            </Typography>
                          </Box>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDenialClick(denial); }}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {denial.is_appealable && denial.denial_status === 'APPROVED_FOR_APPEAL' && (
                            <Tooltip title="Start Appeal">
                              <IconButton size="small" color="primary">
                                <GavelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
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

// ==============================|| APPEALS LIST TAB ||============================== //

interface AppealsListProps {
  onAppealClick: (appeal: Appeal) => void;
}

const AppealsList = ({ onAppealClick }: AppealsListProps) => {
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAppeals(
        {},
        {
          page: page + 1,
          page_size: rowsPerPage
        }
      );
      setAppeals(response.data);
      setTotalCount(response.pagination?.total || response.data.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load appeals');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchAppeals}>
          <RefreshIcon />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Appeal ID</TableCell>
              <TableCell>Claim #</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Payer</TableCell>
              <TableCell>Level</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Appealed Amount</TableCell>
              <TableCell align="right">Recovered</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : appeals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No appeals found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              appeals.map((appeal) => (
                <TableRow
                  key={appeal.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => onAppealClick(appeal)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {appeal.appeal_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{appeal.claim_number || '-'}</TableCell>
                  <TableCell>{appeal.patient_name || '-'}</TableCell>
                  <TableCell>{appeal.payer_name || '-'}</TableCell>
                  <TableCell>
                    <Chip label={formatStatus(appeal.appeal_level)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatStatus(appeal.appeal_status)}
                      size="small"
                      color={getAppealStatusColor(appeal.appeal_status) as any}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {appeal.appealed_amount_formatted || formatCurrency(appeal.appealed_amount)}
                  </TableCell>
                  <TableCell align="right">
                    {appeal.recovered_amount !== undefined && appeal.recovered_amount !== null
                      ? (appeal.recovered_amount_formatted || formatCurrency(appeal.recovered_amount))
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {appeal.submitted_date ? new Date(appeal.submitted_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAppealClick(appeal); }}>
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
  );
};

// ==============================|| TREND CHART ||============================== //

interface TrendChartProps {
  trends: DenialTrend[];
}

const TrendChart = ({ trends }: TrendChartProps) => {
  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Denial Trends</Typography>
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No trend data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const maxDenialRate = Math.max(...trends.map(t => t.denial_rate));

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Denial & Recovery Trends</Typography>
        <Box sx={{ mt: 2 }}>
          {trends.slice(-6).map((trend, index) => (
            <Box key={trend.period} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{trend.period}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {trend.total_denials} denials | {formatCurrency(trend.total_denied_amount)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="error">
                    Denial Rate: {trend.denial_rate.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(trend.denial_rate / (maxDenialRate || 100)) * 100}
                    color="error"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="success">
                    Recovery Rate: {trend.recovery_rate.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={trend.recovery_rate}
                    color="success"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

// ==============================|| MAIN DASHBOARD ||============================== //

const DenialManagementDashboard = () => {
  const [period, setPeriod] = useState('current_month');
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<DenialDashboard | null>(null);
  const [trends, setTrends] = useState<DenialTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDenial, setSelectedDenial] = useState<Denial | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardData, trendsData] = await Promise.all([
        getDenialDashboard(period),
        getDenialTrends('MONTHLY')
      ]);
      setDashboard(dashboardData);
      setTrends(trendsData);
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
    setTabValue(1); // Switch to denials tab
    // Could also set filters based on type
  };

  const handleDenialClick = (denial: Denial) => {
    setSelectedDenial(denial);
  };

  const handleAppealClick = (appeal: Appeal) => {
    setSelectedAppeal(appeal);
  };

  if (loading && !dashboard) {
    return (
      <MainCard title="Denial Management Dashboard">
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
      <MainCard title="Denial Management Dashboard">
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
      title="Denial Management Dashboard"
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

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Overview" />
            <Tab label="Denials" />
            <Tab label="Appeals" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        {tabValue === 0 && dashboard && (
          <>
            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Total Denials"
                  value={dashboard.kpis.total_denials}
                  color="error"
                  trend={dashboard.trends ? {
                    direction: dashboard.trends.denial_rate_trend,
                    change: dashboard.trends.denial_rate_change
                  } : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Denied Amount"
                  value={dashboard.kpis.total_denied_amount_formatted}
                  color="error"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Denial Rate"
                  value={`${dashboard.kpis.denial_rate.toFixed(1)}%`}
                  subtitle="Of total claims"
                  color={dashboard.kpis.denial_rate <= 5 ? 'success' : dashboard.kpis.denial_rate <= 10 ? 'warning' : 'error'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Appeal Success"
                  value={`${dashboard.kpis.appeal_success_rate.toFixed(1)}%`}
                  subtitle="Of appeals won"
                  color={dashboard.kpis.appeal_success_rate >= 60 ? 'success' : dashboard.kpis.appeal_success_rate >= 40 ? 'warning' : 'error'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Recovery Rate"
                  value={`${dashboard.kpis.recovery_rate.toFixed(1)}%`}
                  subtitle="Of denied amount recovered"
                  color="success"
                  trend={dashboard.trends ? {
                    direction: dashboard.trends.recovery_trend,
                    change: dashboard.trends.recovery_change
                  } : undefined}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2}>
                <KPICard
                  title="Preventable"
                  value={`${dashboard.kpis.preventable_rate.toFixed(1)}%`}
                  subtitle="Could be prevented"
                  color={dashboard.kpis.preventable_rate <= 20 ? 'success' : dashboard.kpis.preventable_rate <= 40 ? 'warning' : 'error'}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Details Grid */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <ActionRequiredCard
                  pendingReview={dashboard.action_required.pending_review}
                  expiringDeadlines={dashboard.action_required.expiring_deadlines}
                  awaitingDecision={dashboard.action_required.awaiting_decision}
                  onViewClick={handleActionClick}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TopReasonsTable reasons={dashboard.top_reasons} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TopPayersTable payers={dashboard.top_payers} />
              </Grid>
              <Grid item xs={12}>
                <TrendChart trends={trends} />
              </Grid>
            </Grid>
          </>
        )}

        {/* Denials Tab */}
        {tabValue === 1 && (
          <DenialsList onDenialClick={handleDenialClick} />
        )}

        {/* Appeals Tab */}
        {tabValue === 2 && (
          <AppealsList onAppealClick={handleAppealClick} />
        )}

        {/* Analytics Tab */}
        {tabValue === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TrendChart trends={trends} />
            </Grid>
            {dashboard && (
              <>
                <Grid item xs={12} md={6}>
                  <TopReasonsTable reasons={dashboard.top_reasons} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TopPayersTable payers={dashboard.top_payers} />
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* Footer */}
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString() : 'N/A'}
          </Typography>
        </Box>
      </Box>

      {/* Denial Detail Dialog */}
      <Dialog
        open={!!selectedDenial}
        onClose={() => setSelectedDenial(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedDenial && (
          <>
            <DialogTitle>
              Denial Details - {selectedDenial.claim_number}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography>{selectedDenial.patient_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payer</Typography>
                  <Typography>{selectedDenial.payer_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip
                      label={formatStatus(selectedDenial.denial_status)}
                      size="small"
                      color={getDenialStatusColor(selectedDenial.denial_status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Priority</Typography>
                  <Box>
                    <Chip
                      label={selectedDenial.priority_level}
                      size="small"
                      color={getPriorityColor(selectedDenial.priority_level) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Billed Amount</Typography>
                  <Typography>{selectedDenial.billed_amount_formatted || formatCurrency(selectedDenial.billed_amount)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Denied Amount</Typography>
                  <Typography color="error">{selectedDenial.denied_amount_formatted || formatCurrency(selectedDenial.denied_amount)}</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">Paid Amount</Typography>
                  <Typography color="success.main">{selectedDenial.paid_amount_formatted || formatCurrency(selectedDenial.paid_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">CARC Code</Typography>
                  <Typography>{selectedDenial.primary_carc_code || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Appeal Deadline</Typography>
                  <Typography>
                    {selectedDenial.appeal_deadline
                      ? `${new Date(selectedDenial.appeal_deadline).toLocaleDateString()} (${selectedDenial.days_to_deadline} days)`
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Preventable</Typography>
                  <Typography>{selectedDenial.is_preventable ? 'Yes' : 'No'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Appealable</Typography>
                  <Typography>{selectedDenial.is_appealable ? 'Yes' : 'No'}</Typography>
                </Grid>
                {selectedDenial.root_cause && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Root Cause</Typography>
                    <Typography>{selectedDenial.root_cause}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedDenial(null)}>Close</Button>
              {selectedDenial.is_appealable && selectedDenial.denial_status !== 'APPEALING' && (
                <Button variant="contained" color="primary" startIcon={<GavelIcon />}>
                  Start Appeal
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Appeal Detail Dialog */}
      <Dialog
        open={!!selectedAppeal}
        onClose={() => setSelectedAppeal(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedAppeal && (
          <>
            <DialogTitle>
              Appeal Details - {selectedAppeal.appeal_id}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Claim Number</Typography>
                  <Typography>{selectedAppeal.claim_number || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Patient</Typography>
                  <Typography>{selectedAppeal.patient_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Payer</Typography>
                  <Typography>{selectedAppeal.payer_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Appeal Level</Typography>
                  <Box>
                    <Chip label={formatStatus(selectedAppeal.appeal_level)} size="small" variant="outlined" />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box>
                    <Chip
                      label={formatStatus(selectedAppeal.appeal_status)}
                      size="small"
                      color={getAppealStatusColor(selectedAppeal.appeal_status) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Tracking Number</Typography>
                  <Typography>{selectedAppeal.tracking_number || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Appealed Amount</Typography>
                  <Typography>{selectedAppeal.appealed_amount_formatted || formatCurrency(selectedAppeal.appealed_amount)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Recovered Amount</Typography>
                  <Typography color="success.main">
                    {selectedAppeal.recovered_amount !== undefined && selectedAppeal.recovered_amount !== null
                      ? (selectedAppeal.recovered_amount_formatted || formatCurrency(selectedAppeal.recovered_amount))
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Submitted Date</Typography>
                  <Typography>
                    {selectedAppeal.submitted_date ? new Date(selectedAppeal.submitted_date).toLocaleDateString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Decision Date</Typography>
                  <Typography>
                    {selectedAppeal.decision_date ? new Date(selectedAppeal.decision_date).toLocaleDateString() : '-'}
                  </Typography>
                </Grid>
                {selectedAppeal.decision_summary && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Decision Summary</Typography>
                    <Typography>{selectedAppeal.decision_summary}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedAppeal(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </MainCard>
  );
};

export default DenialManagementDashboard;
