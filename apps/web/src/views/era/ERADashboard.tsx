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
import LinearProgress from '@mui/material/LinearProgress';
import Divider from '@mui/material/Divider';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

// Project Imports
import MainCard from 'components/MainCard';
import ERAUploadDialog from './components/ERAUploadDialog';
import ERAFileDetail from './components/ERAFileDetail';
import ExceptionQueue from './components/ExceptionQueue';
import ReconciliationView from './components/ReconciliationView';
import {
  getERAFiles,
  getERADashboard,
  processERAFile,
  formatCurrency,
  formatFileSize,
  formatStatus,
  getFileStatusColor,
  type ERAFile,
  type ERAFileStatus,
  type ERADashboard as ERADashboardType
} from 'api/era';

// ==============================|| PERIOD OPTIONS ||============================== //

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'current_month', label: 'Current Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30_days', label: 'Last 30 Days' }
];

// ==============================|| KPI CARD ||============================== //

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  loading?: boolean;
}

const KPICard = ({ title, value, subtitle, color = 'primary', icon, loading }: KPICardProps) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        {icon}
      </Box>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h4" sx={{ fontWeight: 600, mb: 0.5, color: `${color}.main` }}>
          {value}
        </Typography>
      )}
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// ==============================|| STATUS ICON ||============================== //

const StatusIcon = ({ status }: { status: ERAFileStatus }) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'PROCESSING':
      return <CircularProgress size={16} />;
    case 'ERROR':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'PARTIALLY_POSTED':
      return <WarningIcon color="warning" fontSize="small" />;
    default:
      return <PendingIcon color="action" fontSize="small" />;
  }
};

// ==============================|| FILES LIST ||============================== //

interface FilesListProps {
  onFileClick: (file: ERAFile) => void;
  onProcessFile: (fileId: string) => void;
  refreshTrigger: number;
}

const FilesList = ({ onFileClick, onProcessFile, refreshTrigger }: FilesListProps) => {
  const [files, setFiles] = useState<ERAFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ERAFileStatus | ''>('');
  const [orderBy, setOrderBy] = useState<string>('receivedDate');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getERAFiles(
        {
          status: statusFilter || undefined,
          search: searchTerm || undefined
        },
        {
          page: page + 1,
          page_size: rowsPerPage,
          sort_by: orderBy,
          sort_order: order
        }
      );
      setFiles(response.data || []);
      setTotalCount(response.pagination?.total || (response.data?.length || 0));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, orderBy, order]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles, refreshTrigger]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={fetchFiles}>
            <RefreshIcon />
          </IconButton>
        }
      >
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
          placeholder="Search files..."
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
            onChange={(e) => setStatusFilter(e.target.value as ERAFileStatus | '')}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="PROCESSING">Processing</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="PARTIALLY_POSTED">Partially Posted</MenuItem>
            <MenuItem value="ERROR">Error</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={fetchFiles} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'fileName'}
                    direction={orderBy === 'fileName' ? order : 'asc'}
                    onClick={() => handleSort('fileName')}
                  >
                    File Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Payer</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'status'}
                    direction={orderBy === 'status' ? order : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    Status
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Payments</TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={orderBy === 'totalAmount'}
                    direction={orderBy === 'totalAmount' ? order : 'asc'}
                    onClick={() => handleSort('totalAmount')}
                  >
                    Total Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">Auto Posted</TableCell>
                <TableCell align="right">Exceptions</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'receivedDate'}
                    direction={orderBy === 'receivedDate' ? order : 'asc'}
                    onClick={() => handleSort('receivedDate')}
                  >
                    Received
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No ERA files found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                files.map((file) => (
                  <TableRow key={file.id} hover sx={{ cursor: 'pointer' }} onClick={() => onFileClick(file)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusIcon status={file.status} />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {file.fileName}
                          </Typography>
                          {file.fileSize && (
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.fileSize)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{file.payerName || '-'}</TableCell>
                    <TableCell>
                      <Chip label={formatStatus(file.status)} size="small" color={getFileStatusColor(file.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} />
                    </TableCell>
                    <TableCell align="right">{file.totalPayments}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(file.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">
                        {file.autoPostedCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {file.exceptionCount > 0 ? (
                        <Chip label={file.exceptionCount} size="small" color="error" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          0
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(file.receivedDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(file.receivedDate).toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFileClick(file);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {file.status === 'PENDING' && (
                          <Tooltip title="Process File">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                onProcessFile(file.fileId);
                              }}
                            >
                              <PlayArrowIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
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

// ==============================|| ACTION CARDS ||============================== //

interface ActionCardsProps {
  dashboard: ERADashboardType | null;
  loading: boolean;
  onActionClick: (type: string) => void;
}

const ActionCards = ({ dashboard, loading, onActionClick }: ActionCardsProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Action Required
      </Typography>
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
          onClick={() => onActionClick('exceptions')}
        >
          <Box>
            <Typography variant="subtitle2">Pending Exceptions</Typography>
            <Typography variant="caption" color="text.secondary">
              Payments requiring review
            </Typography>
          </Box>
          {loading ? (
            <Skeleton variant="circular" width={32} height={32} />
          ) : (
            <Chip label={dashboard?.kpis.pendingExceptions || 0} color="warning" size="small" />
          )}
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
          onClick={() => onActionClick('overdue')}
        >
          <Box>
            <Typography variant="subtitle2">Overdue Exceptions</Typography>
            <Typography variant="caption" color="text.secondary">
              Past SLA deadline
            </Typography>
          </Box>
          {loading ? (
            <Skeleton variant="circular" width={32} height={32} />
          ) : (
            <Chip label={dashboard?.kpis.overdueExceptions || 0} color="error" size="small" />
          )}
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
          onClick={() => onActionClick('reconciliation')}
        >
          <Box>
            <Typography variant="subtitle2">Pending Reconciliation</Typography>
            <Typography variant="caption" color="text.secondary">
              Daily batches to reconcile
            </Typography>
          </Box>
          {loading ? (
            <Skeleton variant="circular" width={32} height={32} />
          ) : (
            <Chip label={dashboard?.reconciliationStatus?.pendingBatches || 0} color="info" size="small" />
          )}
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

// ==============================|| EXCEPTIONS BY TYPE ||============================== //

interface ExceptionsByTypeProps {
  exceptions: ERADashboardType['exceptionsByType'];
  loading: boolean;
}

const ExceptionsByType = ({ exceptions, loading }: ExceptionsByTypeProps) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Exceptions by Type
      </Typography>
      {loading ? (
        <Box>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" height={40} sx={{ mb: 1 }} />
          ))}
        </Box>
      ) : !exceptions || exceptions.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          No exceptions
        </Typography>
      ) : (
        <Stack spacing={2}>
          {exceptions.map((exception) => {
            const maxCount = Math.max(...exceptions.map((e) => e.count));
            const percentage = maxCount > 0 ? (exception.count / maxCount) * 100 : 0;

            return (
              <Box key={exception.type}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{formatStatus(exception.type)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {exception.count} ({formatCurrency(exception.amount)})
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  color={exception.type === 'CLAIM_NOT_FOUND' ? 'error' : 'warning'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </CardContent>
  </Card>
);

// ==============================|| MAIN DASHBOARD ||============================== //

const ERADashboard = () => {
  const [period, setPeriod] = useState('current_month');
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<ERADashboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ERAFile | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [processingFile, setProcessingFile] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await getERADashboard(period);
      setDashboard(dashboardData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProcessFile = async (fileId: string) => {
    setProcessingFile(fileId);
    try {
      await processERAFile(fileId);
      handleRefresh();
    } catch (err) {
      console.error('Failed to process file:', err);
    } finally {
      setProcessingFile(null);
    }
  };

  const handleUploadComplete = () => {
    setUploadDialogOpen(false);
    handleRefresh();
  };

  const handleActionClick = (type: string) => {
    if (type === 'exceptions' || type === 'overdue') {
      setTabValue(2); // Switch to exceptions tab
    } else if (type === 'reconciliation') {
      setTabValue(3); // Switch to reconciliation tab
    }
  };

  if (error && !dashboard) {
    return (
      <MainCard title="ERA Processing Dashboard">
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
      title="ERA Processing Dashboard"
      secondary={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setUploadDialogOpen(true)}>
            Upload ERA
          </Button>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Period</InputLabel>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} label="Period">
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
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Overview" icon={<ReceiptIcon />} iconPosition="start" />
            <Tab label="ERA Files" icon={<UploadFileIcon />} iconPosition="start" />
            <Tab label="Exceptions" icon={<ReportProblemIcon />} iconPosition="start" />
            <Tab label="Reconciliation" icon={<AccountBalanceIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        {tabValue === 0 && (
          <>
            {/* KPIs */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={4} lg={2.4}>
                <KPICard
                  title="Total Files"
                  value={dashboard?.kpis.totalFiles || 0}
                  subtitle="This period"
                  color="primary"
                  icon={<UploadFileIcon color="primary" />}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2.4}>
                <KPICard
                  title="Total Payments"
                  value={dashboard?.kpis.totalPayments || 0}
                  color="info"
                  icon={<ReceiptIcon color="info" />}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2.4}>
                <KPICard
                  title="Payment Amount"
                  value={dashboard?.kpis.totalPaymentAmountFormatted || '$0.00'}
                  color="success"
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2.4}>
                <KPICard
                  title="Auto-Post Rate"
                  value={`${(dashboard?.kpis.autoPostRate || 0).toFixed(1)}%`}
                  subtitle="Payments auto-posted"
                  color={dashboard && dashboard.kpis.autoPostRate >= 80 ? 'success' : 'warning'}
                  loading={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={4} lg={2.4}>
                <KPICard
                  title="Exception Rate"
                  value={`${(dashboard?.kpis.exceptionRate || 0).toFixed(1)}%`}
                  subtitle="Payments with exceptions"
                  color={dashboard && dashboard.kpis.exceptionRate <= 10 ? 'success' : 'error'}
                  loading={loading}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Details Grid */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <ActionCards dashboard={dashboard} loading={loading} onActionClick={handleActionClick} />
              </Grid>
              <Grid item xs={12} md={8}>
                <ExceptionsByType exceptions={dashboard?.exceptionsByType || []} loading={loading} />
              </Grid>
            </Grid>

            {/* Recent Files */}
            {dashboard?.recentFiles && dashboard.recentFiles.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent ERA Files
                </Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>File Name</TableCell>
                        <TableCell>Payer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Amount</TableCell>
                        <TableCell>Received</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboard.recentFiles.slice(0, 5).map((file) => (
                        <TableRow
                          key={file.id}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedFile(file)}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <StatusIcon status={file.status} />
                              <Typography variant="body2">{file.fileName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>{file.payerName || '-'}</TableCell>
                          <TableCell>
                            <Chip label={formatStatus(file.status)} size="small" color={getFileStatusColor(file.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} />
                          </TableCell>
                          <TableCell align="right">{formatCurrency(file.totalAmount)}</TableCell>
                          <TableCell>{new Date(file.receivedDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </>
        )}

        {/* ERA Files Tab */}
        {tabValue === 1 && (
          <FilesList
            onFileClick={setSelectedFile}
            onProcessFile={handleProcessFile}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Exceptions Tab */}
        {tabValue === 2 && <ExceptionQueue onRefresh={handleRefresh} />}

        {/* Reconciliation Tab */}
        {tabValue === 3 && <ReconciliationView onRefresh={handleRefresh} />}
      </Box>

      {/* Upload Dialog */}
      <ERAUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      {/* File Detail Dialog */}
      <Dialog open={!!selectedFile} onClose={() => setSelectedFile(null)} maxWidth="lg" fullWidth>
        {selectedFile && (
          <ERAFileDetail
            file={selectedFile}
            onClose={() => setSelectedFile(null)}
            onProcess={() => {
              handleProcessFile(selectedFile.fileId);
              setSelectedFile(null);
            }}
            onRefresh={handleRefresh}
          />
        )}
      </Dialog>

      {/* Processing Indicator */}
      {processingFile && (
        <Dialog open maxWidth="xs" fullWidth>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <CircularProgress sx={{ mb: 2 }} />
              <Typography>Processing ERA file...</Typography>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </MainCard>
  );
};

export default ERADashboard;
