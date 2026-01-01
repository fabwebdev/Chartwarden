'use client';

import { useState, useEffect, useCallback } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import LinearProgress from '@mui/material/LinearProgress';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SyncIcon from '@mui/icons-material/Sync';

// Project Imports
import {
  getReconciliationStatus,
  getReconciliationSummary,
  reconcileBatch,
  formatCurrency,
  formatStatus,
  getReconciliationStatusColor,
  type ReconciliationBatch,
  type ReconciliationStatus
} from 'api/era';

// ==============================|| TYPES ||============================== //

interface ReconciliationViewProps {
  onRefresh: () => void;
}

// ==============================|| STATUS ICON ||============================== //

const StatusIcon = ({ status }: { status: ReconciliationStatus }) => {
  switch (status) {
    case 'RECONCILED':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'VARIANCE':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'IN_PROGRESS':
      return <SyncIcon color="info" fontSize="small" />;
    default:
      return <WarningIcon color="warning" fontSize="small" />;
  }
};

// ==============================|| SUMMARY CARDS ||============================== //

interface SummaryCardsProps {
  summary: {
    totalBatches: number;
    reconciledCount: number;
    varianceCount: number;
    totalDeposits: number;
    totalPayments: number;
    totalVariance: number;
  } | null;
  loading: boolean;
}

const SummaryCards = ({ summary, loading }: SummaryCardsProps) => (
  <Grid container spacing={2} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Batches
          </Typography>
          {loading ? (
            <Skeleton variant="text" width="60%" height={40} />
          ) : (
            <Typography variant="h4" fontWeight={600}>
              {summary?.totalBatches || 0}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Reconciled
          </Typography>
          {loading ? (
            <Skeleton variant="text" width="60%" height={40} />
          ) : (
            <Typography variant="h4" fontWeight={600} color="success.main">
              {summary?.reconciledCount || 0}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            With Variance
          </Typography>
          {loading ? (
            <Skeleton variant="text" width="60%" height={40} />
          ) : (
            <Typography variant="h4" fontWeight={600} color="error.main">
              {summary?.varianceCount || 0}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Total Variance
          </Typography>
          {loading ? (
            <Skeleton variant="text" width="60%" height={40} />
          ) : (
            <Typography
              variant="h4"
              fontWeight={600}
              color={summary && summary.totalVariance !== 0 ? 'error.main' : 'text.primary'}
            >
              {formatCurrency(summary?.totalVariance || 0)}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

// ==============================|| RECONCILE DIALOG ||============================== //

interface ReconcileDialogProps {
  open: boolean;
  batch: ReconciliationBatch | null;
  onClose: () => void;
  onReconcile: (data: {
    depositAmount: number;
    bankStatementAmount?: number;
    bankAccountNumber?: string;
    bankStatementReference?: string;
  }) => void;
  loading: boolean;
}

const ReconcileDialog = ({ open, batch, onClose, onReconcile, loading }: ReconcileDialogProps) => {
  const [depositAmount, setDepositAmount] = useState('');
  const [bankStatementAmount, setBankStatementAmount] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankStatementReference, setBankStatementReference] = useState('');

  useEffect(() => {
    if (batch) {
      setDepositAmount(batch.depositAmount ? (batch.depositAmount / 100).toFixed(2) : '');
      setBankStatementAmount(batch.bankStatementAmount ? (batch.bankStatementAmount / 100).toFixed(2) : '');
      setBankAccountNumber(batch.bankAccountNumber || '');
      setBankStatementReference(batch.bankStatementReference || '');
    }
  }, [batch]);

  const handleReconcile = () => {
    onReconcile({
      depositAmount: Math.round(parseFloat(depositAmount) * 100),
      bankStatementAmount: bankStatementAmount ? Math.round(parseFloat(bankStatementAmount) * 100) : undefined,
      bankAccountNumber: bankAccountNumber || undefined,
      bankStatementReference: bankStatementReference || undefined
    });
  };

  if (!batch) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reconcile Batch</DialogTitle>
      <DialogContent dividers>
        {/* Batch Summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Batch Date
              </Typography>
              <Typography variant="body2">
                {new Date(batch.batchDate).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                ERA Files
              </Typography>
              <Typography variant="body2">{batch.eraFileCount}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Total ERA Payments
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatCurrency(batch.totalEraPayments)}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                Total Posted
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatCurrency(batch.totalPostedPayments)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Bank Statement Info */}
        <Typography variant="subtitle2" gutterBottom>
          Bank Statement Information
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Deposit Amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              fullWidth
              size="small"
              type="number"
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Bank Statement Amount"
              value={bankStatementAmount}
              onChange={(e) => setBankStatementAmount(e.target.value)}
              fullWidth
              size="small"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Bank Account Number"
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Statement Reference"
              value={bankStatementReference}
              onChange={(e) => setBankStatementReference(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>

        {/* Variance Preview */}
        {depositAmount && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Variance Preview
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                ERA Payments Total
              </Typography>
              <Typography variant="body2">{formatCurrency(batch.totalEraPayments)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                Deposit Amount
              </Typography>
              <Typography variant="body2">{formatCurrency(Math.round(parseFloat(depositAmount || '0') * 100))}</Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" fontWeight={500}>
                Variance
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                color={
                  batch.totalEraPayments - Math.round(parseFloat(depositAmount || '0') * 100) !== 0
                    ? 'error.main'
                    : 'success.main'
                }
              >
                {formatCurrency(batch.totalEraPayments - Math.round(parseFloat(depositAmount || '0') * 100))}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleReconcile}
          disabled={loading || !depositAmount}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          Reconcile
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| BATCH DETAIL DIALOG ||============================== //

interface BatchDetailDialogProps {
  open: boolean;
  batch: ReconciliationBatch | null;
  onClose: () => void;
  onReconcile: () => void;
}

const BatchDetailDialog = ({ open, batch, onClose, onReconcile }: BatchDetailDialogProps) => {
  if (!batch) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Reconciliation Details</Typography>
            <Typography variant="caption" color="text.secondary">
              Batch: {batch.batchId}
            </Typography>
          </Box>
          <Chip
            label={formatStatus(batch.reconciliationStatus)}
            color={getReconciliationStatusColor(batch.reconciliationStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
            icon={<StatusIcon status={batch.reconciliationStatus} />}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Batch Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Batch Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Batch Date
                  </Typography>
                  <Typography variant="body2">
                    {new Date(batch.batchDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit Date
                  </Typography>
                  <Typography variant="body2">
                    {batch.depositDate ? new Date(batch.depositDate).toLocaleDateString() : '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    ERA Files
                  </Typography>
                  <Typography variant="body2">{batch.eraFileCount}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Bank Account
                  </Typography>
                  <Typography variant="body2">{batch.bankAccountNumber || '-'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Statement Reference
                  </Typography>
                  <Typography variant="body2">{batch.bankStatementReference || '-'}</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Financial Summary */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Financial Summary
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    ERA Payments
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(batch.totalEraPayments)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Posted Payments
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(batch.totalPostedPayments)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Deposit Amount
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(batch.depositAmount || 0)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Bank Statement
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatCurrency(batch.bankStatementAmount || 0)}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={500}>
                    Variance
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    color={batch.varianceAmount !== 0 ? 'error.main' : 'success.main'}
                  >
                    {formatCurrency(batch.varianceAmount || 0)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Unmatched Deposits */}
          {batch.unmatchedDeposits && batch.unmatchedDeposits.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Unmatched Deposits
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  {batch.unmatchedDeposits.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{item.reference || item.id}</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Unmatched ERAs */}
          {batch.unmatchedEras && batch.unmatchedEras.length > 0 && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Unmatched ERA Payments
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1}>
                  {batch.unmatchedEras.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{item.reference || item.id}</Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(item.amount)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          )}

          {/* Reconciliation Info */}
          {batch.isReconciled && (
            <Grid item xs={12}>
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="subtitle2">Reconciled</Typography>
                <Typography variant="body2">
                  Reconciled by {batch.reconciledByName || 'Unknown'} on{' '}
                  {batch.reconciledAt ? new Date(batch.reconciledAt).toLocaleString() : 'Unknown'}
                </Typography>
              </Alert>
            </Grid>
          )}

          {batch.reconciliationStatus === 'VARIANCE' && (
            <Grid item xs={12}>
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2">Variance Detected</Typography>
                <Typography variant="body2">
                  This batch has a variance of {formatCurrency(batch.varianceAmount || 0)}. Please investigate and resolve.
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!batch.isReconciled && batch.reconciliationStatus !== 'RECONCILED' && (
          <Button variant="contained" onClick={onReconcile} startIcon={<SyncIcon />}>
            Reconcile
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| MAIN COMPONENT ||============================== //

const ReconciliationView = ({ onRefresh }: ReconciliationViewProps) => {
  const [batches, setBatches] = useState<ReconciliationBatch[]>([]);
  const [summary, setSummary] = useState<{
    totalBatches: number;
    reconciledCount: number;
    varianceCount: number;
    totalDeposits: number;
    totalPayments: number;
    totalVariance: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReconciliationStatus | ''>('');
  const [selectedForDetail, setSelectedForDetail] = useState<ReconciliationBatch | null>(null);
  const [selectedForReconcile, setSelectedForReconcile] = useState<ReconciliationBatch | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [batchesData, summaryData] = await Promise.all([
        getReconciliationStatus(),
        getReconciliationSummary({ status: statusFilter || undefined })
      ]);
      setBatches(batchesData || []);
      setSummary(summaryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load reconciliation data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReconcile = async (data: {
    depositAmount: number;
    bankStatementAmount?: number;
    bankAccountNumber?: string;
    bankStatementReference?: string;
  }) => {
    if (!selectedForReconcile) return;

    setReconciling(true);
    try {
      await reconcileBatch(selectedForReconcile.batchDate, data);
      setSelectedForReconcile(null);
      fetchData();
      onRefresh();
    } catch (err) {
      console.error('Failed to reconcile batch:', err);
    } finally {
      setReconciling(false);
    }
  };

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={fetchData}>
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
      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReconciliationStatus | '')}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
            <MenuItem value="RECONCILED">Reconciled</MenuItem>
            <MenuItem value="VARIANCE">With Variance</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={fetchData} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Batch Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">ERA Files</TableCell>
                <TableCell align="right">ERA Payments</TableCell>
                <TableCell align="right">Deposit</TableCell>
                <TableCell align="right">Variance</TableCell>
                <TableCell>Reconciled By</TableCell>
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
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No reconciliation batches found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: batch.reconciliationStatus === 'VARIANCE' ? 'error.lighter' : undefined
                    }}
                    onClick={() => setSelectedForDetail(batch)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(batch.batchDate).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {batch.batchId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatStatus(batch.reconciliationStatus)}
                        size="small"
                        color={getReconciliationStatusColor(batch.reconciliationStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        icon={<StatusIcon status={batch.reconciliationStatus} />}
                      />
                    </TableCell>
                    <TableCell align="right">{batch.eraFileCount}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(batch.totalEraPayments)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(batch.depositAmount || 0)}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        color={batch.varianceAmount && batch.varianceAmount !== 0 ? 'error.main' : 'success.main'}
                      >
                        {formatCurrency(batch.varianceAmount || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>{batch.reconciledByName || '-'}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForDetail(batch);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {!batch.isReconciled && batch.reconciliationStatus !== 'RECONCILED' && (
                          <Tooltip title="Reconcile">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedForReconcile(batch);
                              }}
                            >
                              <SyncIcon fontSize="small" />
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
      </Paper>

      {/* Detail Dialog */}
      <BatchDetailDialog
        open={!!selectedForDetail}
        batch={selectedForDetail}
        onClose={() => setSelectedForDetail(null)}
        onReconcile={() => {
          setSelectedForReconcile(selectedForDetail);
          setSelectedForDetail(null);
        }}
      />

      {/* Reconcile Dialog */}
      <ReconcileDialog
        open={!!selectedForReconcile}
        batch={selectedForReconcile}
        onClose={() => setSelectedForReconcile(null)}
        onReconcile={handleReconcile}
        loading={reconciling}
      />
    </Box>
  );
};

export default ReconciliationView;
