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
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
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

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';

// Project Imports
import {
  getPostingExceptions,
  resolveException,
  formatCurrency,
  formatStatus,
  getSeverityColor,
  getExceptionStatusColor,
  getExceptionTypeDescription,
  type PostingException,
  type ExceptionType,
  type ExceptionSeverity,
  type ExceptionStatus
} from 'api/era';

// ==============================|| TYPES ||============================== //

interface ExceptionQueueProps {
  onRefresh: () => void;
}

// ==============================|| SEVERITY ICON ||============================== //

const SeverityIcon = ({ severity }: { severity: ExceptionSeverity }) => {
  switch (severity) {
    case 'CRITICAL':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'HIGH':
      return <WarningIcon color="warning" fontSize="small" />;
    case 'MEDIUM':
      return <AccessTimeIcon color="info" fontSize="small" />;
    default:
      return <AccessTimeIcon color="action" fontSize="small" />;
  }
};

// ==============================|| RESOLVE DIALOG ||============================== //

interface ResolveDialogProps {
  open: boolean;
  exception: PostingException | null;
  onClose: () => void;
  onResolve: (resolution: {
    resolutionType: 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED';
    claimId?: number;
    notes?: string;
    amount?: number;
  }) => void;
  loading: boolean;
}

const ResolveDialog = ({ open, exception, onClose, onResolve, loading }: ResolveDialogProps) => {
  const [resolutionType, setResolutionType] = useState<
    'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED'
  >('MANUAL_POSTED');
  const [claimId, setClaimId] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');

  const handleResolve = () => {
    onResolve({
      resolutionType,
      claimId: claimId ? parseInt(claimId, 10) : undefined,
      notes: notes || undefined,
      amount: amount ? parseFloat(amount) * 100 : undefined
    });
  };

  if (!exception) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Resolve Exception</DialogTitle>
      <DialogContent dividers>
        {/* Exception Summary */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Exception ID
              </Typography>
              <Typography variant="body2">{exception.exceptionId}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Type
              </Typography>
              <Typography variant="body2">{formatStatus(exception.exceptionType)}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Severity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SeverityIcon severity={exception.severity} />
                <Typography variant="body2">{exception.severity}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">
                Amount
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {formatCurrency(exception.actualAmount || 0)}
              </Typography>
            </Grid>
            {exception.variance && exception.variance !== 0 && (
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  Variance
                </Typography>
                <Typography variant="body2" color={exception.variance > 0 ? 'success.main' : 'error.main'}>
                  {formatCurrency(exception.variance)}
                </Typography>
              </Grid>
            )}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2">
                {exception.description || getExceptionTypeDescription(exception.exceptionType)}
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Match Candidates */}
        {exception.matchedCandidates && exception.matchedCandidates.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Potential Claim Matches
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Claim ID</TableCell>
                    <TableCell>Claim #</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell align="right">Billed</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="right">Match %</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {exception.matchedCandidates.map((candidate) => (
                    <TableRow key={candidate.claimId} hover>
                      <TableCell>{candidate.claimId}</TableCell>
                      <TableCell>{candidate.claimNumber || '-'}</TableCell>
                      <TableCell>{candidate.patientName || '-'}</TableCell>
                      <TableCell align="right">{formatCurrency(candidate.billedAmount || 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(candidate.balance || 0)}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${candidate.confidence}%`}
                          size="small"
                          color={candidate.confidence >= 80 ? 'success' : candidate.confidence >= 50 ? 'warning' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setClaimId(candidate.claimId.toString())}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Resolution Form */}
        <Typography variant="subtitle2" gutterBottom>
          Resolution Details
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Resolution Type</InputLabel>
              <Select
                value={resolutionType}
                onChange={(e) =>
                  setResolutionType(
                    e.target.value as 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED'
                  )
                }
                label="Resolution Type"
              >
                <MenuItem value="MANUAL_POSTED">Manual Post to Claim</MenuItem>
                <MenuItem value="CLAIM_CORRECTED">Claim Corrected</MenuItem>
                <MenuItem value="PAYER_CONTACTED">Payer Contacted</MenuItem>
                <MenuItem value="WRITTEN_OFF">Write Off</MenuItem>
                <MenuItem value="REFUNDED">Refund Processed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Claim ID"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              fullWidth
              size="small"
              helperText="Required for Manual Post"
            />
          </Grid>
          {(resolutionType === 'WRITTEN_OFF' || resolutionType === 'REFUNDED') && (
            <Grid item xs={12} md={6}>
              <TextField
                label="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                size="small"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              label="Resolution Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleResolve}
          disabled={loading || (resolutionType === 'MANUAL_POSTED' && !claimId)}
          startIcon={loading ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        >
          Resolve Exception
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| EXCEPTION DETAIL DIALOG ||============================== //

interface ExceptionDetailDialogProps {
  open: boolean;
  exception: PostingException | null;
  onClose: () => void;
  onResolve: () => void;
}

const ExceptionDetailDialog = ({ open, exception, onClose, onResolve }: ExceptionDetailDialogProps) => {
  if (!exception) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Exception Details</Typography>
            <Typography variant="caption" color="text.secondary">
              {exception.exceptionId}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={exception.severity}
              size="small"
              color={getSeverityColor(exception.severity) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
              icon={<SeverityIcon severity={exception.severity} />}
            />
            <Chip label={formatStatus(exception.status)} size="small" color={getExceptionStatusColor(exception.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} />
          </Stack>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Exception Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Exception Information
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body2">{formatStatus(exception.exceptionType)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Expected Amount
                  </Typography>
                  <Typography variant="body2">{formatCurrency(exception.expectedAmount || 0)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Actual Amount
                  </Typography>
                  <Typography variant="body2">{formatCurrency(exception.actualAmount || 0)}</Typography>
                </Box>
                {exception.variance !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Variance
                    </Typography>
                    <Typography
                      variant="body2"
                      color={exception.variance > 0 ? 'success.main' : 'error.main'}
                    >
                      {formatCurrency(exception.variance)}
                    </Typography>
                  </Box>
                )}
                {exception.matchConfidence !== undefined && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Match Confidence
                    </Typography>
                    <Chip
                      label={`${exception.matchConfidence}%`}
                      size="small"
                      color={
                        exception.matchConfidence >= 80
                          ? 'success'
                          : exception.matchConfidence >= 50
                            ? 'warning'
                            : 'error'
                      }
                    />
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    SLA Deadline
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {exception.isOverdue && <ErrorIcon color="error" fontSize="small" />}
                    <Typography
                      variant="body2"
                      color={exception.isOverdue ? 'error.main' : 'text.primary'}
                    >
                      {exception.slaDeadline
                        ? new Date(exception.slaDeadline).toLocaleString()
                        : '-'}
                    </Typography>
                  </Box>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Assignment & Follow-up */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Assignment & Follow-up
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Assigned To
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">{exception.assignedToName || 'Unassigned'}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Follow-up Required
                  </Typography>
                  <Typography variant="body2">
                    {exception.followUpRequired ? 'Yes' : 'No'}
                  </Typography>
                </Box>
                {exception.followUpDate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Follow-up Date
                    </Typography>
                    <Typography variant="body2">
                      {new Date(exception.followUpDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(exception.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2">
                {exception.description || getExceptionTypeDescription(exception.exceptionType)}
              </Typography>
            </Paper>
          </Grid>

          {/* Payment Info */}
          {exception.paymentInfo && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Payment Information
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Patient
                    </Typography>
                    <Typography variant="body2">{exception.paymentInfo.patientName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Check Number
                    </Typography>
                    <Typography variant="body2">{exception.paymentInfo.checkNumber || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Payment Amount
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {formatCurrency(exception.paymentInfo.totalPaymentAmount || 0)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" color="text.secondary">
                      Control Number
                    </Typography>
                    <Typography variant="body2">
                      {exception.paymentInfo.payerClaimControlNumber || '-'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Resolution Info */}
          {exception.status === 'RESOLVED' && (
            <Grid item xs={12}>
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="subtitle2">Resolution</Typography>
                <Typography variant="body2">
                  Resolved by {exception.resolvedByName || 'Unknown'} on{' '}
                  {exception.resolvedAt ? new Date(exception.resolvedAt).toLocaleString() : 'Unknown'}
                </Typography>
                {exception.resolution && <Typography variant="body2">{exception.resolution}</Typography>}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {exception.status !== 'RESOLVED' && exception.status !== 'CLOSED' && (
          <Button variant="contained" onClick={onResolve} startIcon={<CheckCircleIcon />}>
            Resolve
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| MAIN COMPONENT ||============================== //

const ExceptionQueue = ({ onRefresh }: ExceptionQueueProps) => {
  const [exceptions, setExceptions] = useState<PostingException[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExceptionStatus | ''>('');
  const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | ''>('');
  const [orderBy, setOrderBy] = useState<string>('severity');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedForDetail, setSelectedForDetail] = useState<PostingException | null>(null);
  const [selectedForResolve, setSelectedForResolve] = useState<PostingException | null>(null);
  const [resolving, setResolving] = useState(false);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getPostingExceptions(
        {
          status: statusFilter || undefined,
          severity: severityFilter || undefined
        },
        {
          page: page + 1,
          page_size: rowsPerPage,
          sort_by: orderBy,
          sort_order: order
        }
      );
      setExceptions(response.data || []);
      setTotalCount(response.pagination?.total || (response.data?.length || 0));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load exceptions';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, severityFilter, orderBy, order]);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleResolve = async (resolution: {
    resolutionType: 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED';
    claimId?: number;
    notes?: string;
    amount?: number;
  }) => {
    if (!selectedForResolve) return;

    setResolving(true);
    try {
      await resolveException(selectedForResolve.exceptionId, resolution);
      setSelectedForResolve(null);
      fetchExceptions();
      onRefresh();
    } catch (err) {
      console.error('Failed to resolve exception:', err);
    } finally {
      setResolving(false);
    }
  };

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton color="inherit" size="small" onClick={fetchExceptions}>
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
          placeholder="Search exceptions..."
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
            onChange={(e) => setStatusFilter(e.target.value as ExceptionStatus | '')}
            label="Status"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="ASSIGNED">Assigned</MenuItem>
            <MenuItem value="IN_REVIEW">In Review</MenuItem>
            <MenuItem value="RESOLVED">Resolved</MenuItem>
            <MenuItem value="CLOSED">Closed</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Severity</InputLabel>
          <Select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as ExceptionSeverity | '')}
            label="Severity"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="CRITICAL">Critical</MenuItem>
            <MenuItem value="HIGH">High</MenuItem>
            <MenuItem value="MEDIUM">Medium</MenuItem>
            <MenuItem value="LOW">Low</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={fetchExceptions} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'exceptionId'}
                    direction={orderBy === 'exceptionId' ? order : 'asc'}
                    onClick={() => handleSort('exceptionId')}
                  >
                    Exception ID
                  </TableSortLabel>
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'severity'}
                    direction={orderBy === 'severity' ? order : 'asc'}
                    onClick={() => handleSort('severity')}
                  >
                    Severity
                  </TableSortLabel>
                </TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Claim</TableCell>
                <TableCell>SLA Deadline</TableCell>
                <TableCell>Assigned To</TableCell>
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
              ) : exceptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No exceptions found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                exceptions.map((exception) => (
                  <TableRow
                    key={exception.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      bgcolor: exception.isOverdue ? 'error.lighter' : undefined
                    }}
                    onClick={() => setSelectedForDetail(exception)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {exception.exceptionId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={getExceptionTypeDescription(exception.exceptionType)}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                          {formatStatus(exception.exceptionType)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={exception.severity}
                        size="small"
                        color={getSeverityColor(exception.severity) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        icon={<SeverityIcon severity={exception.severity} />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={formatStatus(exception.status)} size="small" color={getExceptionStatusColor(exception.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={500}>
                        {formatCurrency(exception.actualAmount || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {exception.claimInfo?.claimNumber || exception.claimId || '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {exception.isOverdue && <ErrorIcon color="error" fontSize="small" />}
                        <Typography
                          variant="body2"
                          color={exception.isOverdue ? 'error.main' : 'text.primary'}
                        >
                          {exception.slaDeadline
                            ? new Date(exception.slaDeadline).toLocaleDateString()
                            : '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{exception.assignedToName || '-'}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedForDetail(exception);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {exception.status !== 'RESOLVED' && exception.status !== 'CLOSED' && (
                          <Tooltip title="Resolve">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedForResolve(exception);
                              }}
                            >
                              <CheckCircleIcon fontSize="small" />
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

      {/* Detail Dialog */}
      <ExceptionDetailDialog
        open={!!selectedForDetail}
        exception={selectedForDetail}
        onClose={() => setSelectedForDetail(null)}
        onResolve={() => {
          setSelectedForResolve(selectedForDetail);
          setSelectedForDetail(null);
        }}
      />

      {/* Resolve Dialog */}
      <ResolveDialog
        open={!!selectedForResolve}
        exception={selectedForResolve}
        onClose={() => setSelectedForResolve(null)}
        onResolve={handleResolve}
        loading={resolving}
      />
    </Box>
  );
};

export default ExceptionQueue;
