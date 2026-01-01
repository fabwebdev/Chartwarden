'use client';

import { useState, useEffect, useCallback } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Skeleton from '@mui/material/Skeleton';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

// Icons
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import PendingIcon from '@mui/icons-material/Pending';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditIcon from '@mui/icons-material/Edit';

// Project Imports
import {
  getERAPayments,
  postPayment,
  formatCurrency,
  formatFileSize,
  formatStatus,
  getFileStatusColor,
  getPostingStatusColor,
  type ERAFile,
  type ERAPayment,
  type ERAPostingStatus
} from 'api/era';

// ==============================|| TYPES ||============================== //

interface ERAFileDetailProps {
  file: ERAFile;
  onClose: () => void;
  onProcess: () => void;
  onRefresh: () => void;
}

// ==============================|| STATUS ICON ||============================== //

const StatusIcon = ({ status }: { status: ERAPostingStatus }) => {
  switch (status) {
    case 'AUTO_POSTED':
    case 'MANUAL_POSTED':
      return <CheckCircleIcon color="success" fontSize="small" />;
    case 'EXCEPTION':
      return <ErrorIcon color="error" fontSize="small" />;
    case 'DENIED':
      return <WarningIcon color="warning" fontSize="small" />;
    default:
      return <PendingIcon color="action" fontSize="small" />;
  }
};

// ==============================|| PAYMENT ROW ||============================== //

interface PaymentRowProps {
  payment: ERAPayment;
  onPost: (paymentId: string) => void;
  posting: boolean;
}

const PaymentRow = ({ payment, onPost, posting }: PaymentRowProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusIcon status={payment.postingStatus} />
            <Typography variant="body2">{payment.paymentId}</Typography>
          </Box>
        </TableCell>
        <TableCell>{payment.patientName || payment.patientControlNumber || '-'}</TableCell>
        <TableCell>{payment.checkNumber || '-'}</TableCell>
        <TableCell>
          <Chip
            label={formatStatus(payment.postingStatus)}
            size="small"
            color={getPostingStatusColor(payment.postingStatus) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          />
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{formatCurrency(payment.totalBilledAmount || 0)}</Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" fontWeight={500} color="success.main">
            {formatCurrency(payment.totalPaymentAmount)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" color="error.main">
            {formatCurrency(payment.totalAdjustmentAmount || 0)}
          </Typography>
        </TableCell>
        <TableCell align="center">
          {payment.postingStatus === 'PENDING' && (
            <Tooltip title="Post Payment">
              <IconButton
                size="small"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onPost(payment.paymentId);
                }}
                disabled={posting}
              >
                {posting ? <CircularProgress size={16} /> : <AttachMoneyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
          {payment.postingStatus === 'EXCEPTION' && (
            <Tooltip title="Resolve Exception">
              <IconButton
                size="small"
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded Details */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} sx={{ py: 0 }}>
            <Box sx={{ p: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Details
                  </Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Claim Status
                      </Typography>
                      <Typography variant="body2">{payment.claimStatus || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Check Date
                      </Typography>
                      <Typography variant="body2">
                        {payment.checkDate ? new Date(payment.checkDate).toLocaleDateString() : '-'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Payer Control #
                      </Typography>
                      <Typography variant="body2">{payment.payerClaimControlNumber || '-'}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Allowed Amount
                      </Typography>
                      <Typography variant="body2">{formatCurrency(payment.totalAllowedAmount || 0)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Contractual Adjustment
                      </Typography>
                      <Typography variant="body2">{formatCurrency(payment.contractualAdjustment || 0)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        Patient Responsibility
                      </Typography>
                      <Typography variant="body2">{formatCurrency(payment.patientResponsibility || 0)}</Typography>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Adjustment Codes
                  </Typography>
                  {payment.adjustmentCodes && payment.adjustmentCodes.length > 0 ? (
                    <Stack spacing={0.5}>
                      {payment.adjustmentCodes.map((adj, i) => (
                        <Chip
                          key={i}
                          label={`${adj.groupCode}-${adj.code}: ${formatCurrency(adj.amount)}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No adjustments
                    </Typography>
                  )}

                  {payment.remarkCodes && payment.remarkCodes.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Remark Codes
                      </Typography>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {payment.remarkCodes.map((code, i) => (
                          <Chip key={i} label={code} size="small" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {payment.isException && payment.exceptionReason && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {payment.exceptionReason}
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// ==============================|| POST PAYMENT DIALOG ||============================== //

interface PostPaymentDialogProps {
  open: boolean;
  paymentId: string | null;
  onClose: () => void;
  onConfirm: (claimId?: number, notes?: string) => void;
  loading: boolean;
}

const PostPaymentDialog = ({ open, paymentId, onClose, onConfirm, loading }: PostPaymentDialogProps) => {
  const [claimId, setClaimId] = useState<string>('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(claimId ? parseInt(claimId, 10) : undefined, notes || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Post Payment</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Posting payment: {paymentId}
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Override Claim ID (optional)"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
            fullWidth
            size="small"
            helperText="Leave empty to use auto-matched claim"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <AttachMoneyIcon />}
        >
          Post Payment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==============================|| MAIN COMPONENT ||============================== //

const ERAFileDetail = ({ file, onClose, onProcess, onRefresh }: ERAFileDetailProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [payments, setPayments] = useState<ERAPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ERAPostingStatus | ''>('');
  const [postingPaymentId, setPostingPaymentId] = useState<string | null>(null);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getERAPayments(file.fileId, {
        status: statusFilter || undefined
      });
      setPayments(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payments';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [file.fileId, statusFilter]);

  useEffect(() => {
    if (tabValue === 1) {
      fetchPayments();
    }
  }, [fetchPayments, tabValue]);

  const handlePostPayment = (paymentId: string) => {
    setPostingPaymentId(paymentId);
    setPostDialogOpen(true);
  };

  const handleConfirmPost = async (claimId?: number, notes?: string) => {
    if (!postingPaymentId) return;

    setPosting(true);
    try {
      await postPayment(postingPaymentId, { claimId, notes });
      setPostDialogOpen(false);
      setPostingPaymentId(null);
      fetchPayments();
      onRefresh();
    } catch (err) {
      console.error('Failed to post payment:', err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">{file.fileName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {file.fileSize ? formatFileSize(file.fileSize) : ''} | Received:{' '}
              {new Date(file.receivedDate).toLocaleString()}
            </Typography>
          </Box>
          <Chip
            label={formatStatus(file.status)}
            color={getFileStatusColor(file.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
          <Tab label="Summary" />
          <Tab label="Payments" />
        </Tabs>

        {/* Summary Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            {/* File Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                File Information
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      File ID
                    </Typography>
                    <Typography variant="body2">{file.fileId}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Control Number
                    </Typography>
                    <Typography variant="body2">{file.controlNumber || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Payer
                    </Typography>
                    <Typography variant="body2">{file.payerName || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Payer ID
                    </Typography>
                    <Typography variant="body2">{file.payerIdentifier || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Production Date
                    </Typography>
                    <Typography variant="body2">
                      {file.productionDate ? new Date(file.productionDate).toLocaleDateString() : '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Source
                    </Typography>
                    <Typography variant="body2">{file.source || 'MANUAL_UPLOAD'}</Typography>
                  </Box>
                  {file.uploadedByName && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Uploaded By
                      </Typography>
                      <Typography variant="body2">{file.uploadedByName}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Processing Stats */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Processing Statistics
              </Typography>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Payments
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {file.totalPayments}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="body2" fontWeight={500} color="success.main">
                      {formatCurrency(file.totalAmount)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Auto-Posted
                    </Typography>
                    <Chip label={file.autoPostedCount} size="small" color="success" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Exceptions
                    </Typography>
                    <Chip
                      label={file.exceptionCount}
                      size="small"
                      color={file.exceptionCount > 0 ? 'error' : 'default'}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Claims
                    </Typography>
                    <Typography variant="body2">{file.totalClaims}</Typography>
                  </Box>
                  {file.processedAt && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Processed At
                      </Typography>
                      <Typography variant="body2">
                        {new Date(file.processedAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Error Message */}
            {file.status === 'ERROR' && file.errorMessage && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="subtitle2">Processing Error</Typography>
                  <Typography variant="body2">{file.errorMessage}</Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        )}

        {/* Payments Tab */}
        {tabValue === 1 && (
          <Box>
            {/* Filters */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ERAPostingStatus | '')}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="AUTO_POSTED">Auto Posted</MenuItem>
                  <MenuItem value="MANUAL_POSTED">Manual Posted</MenuItem>
                  <MenuItem value="EXCEPTION">Exception</MenuItem>
                  <MenuItem value="DENIED">Denied</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={fetchPayments} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Stack>

            {/* Error */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Table */}
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Payment ID</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Check #</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Billed</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Adjustments</TableCell>
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
                  ) : payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>
                          No payments found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <PaymentRow
                        key={payment.id}
                        payment={payment}
                        onPost={handlePostPayment}
                        posting={posting && postingPaymentId === payment.paymentId}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {file.status === 'PENDING' && (
          <Button variant="contained" startIcon={<PlayArrowIcon />} onClick={onProcess}>
            Process File
          </Button>
        )}
      </DialogActions>

      {/* Post Payment Dialog */}
      <PostPaymentDialog
        open={postDialogOpen}
        paymentId={postingPaymentId}
        onClose={() => {
          setPostDialogOpen(false);
          setPostingPaymentId(null);
        }}
        onConfirm={handleConfirmPost}
        loading={posting}
      />
    </>
  );
};

export default ERAFileDetail;
