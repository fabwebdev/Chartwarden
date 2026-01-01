import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Chip,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Paper
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { SnackbarProps } from 'types/snackbar';
import { Add, More, Edit2, Trash, Pause, Play, Warning2 } from 'iconsax-react';

import MedicationOrderForm from './MedicationOrderForm';
import {
  Medication,
  getPatientMedications,
  discontinueMedication,
  holdMedication,
  pauseMedication,
  resumeMedication,
  cancelMedication,
  MEDICATION_STATUSES,
  MEDICATION_ROUTES,
  MEDICATION_FREQUENCIES,
  MedicationStatus
} from 'api/medication';

interface MedicationListProps {
  patientId: string | number;
}

const MedicationList = ({ patientId }: MedicationListProps) => {
  const theme = useTheme();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [hospiceFilter, setHospiceFilter] = useState<string>('');

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'discontinue' | 'hold' | 'pause' | 'cancel' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionDate, setActionDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Menu anchor
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuMedication, setMenuMedication] = useState<Medication | null>(null);

  const fetchMedications = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage
      };
      if (statusFilter) params.status = statusFilter;
      if (hospiceFilter) params.is_hospice_related = hospiceFilter === 'true';

      const response = await getPatientMedications(patientId, params);
      setMedications(response.data || []);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Error fetching medications:', error);
      openSnackbar({
        open: true,
        message: 'Failed to load medications',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setLoading(false);
    }
  }, [patientId, page, rowsPerPage, statusFilter, hospiceFilter]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, medication: Medication) => {
    setAnchorEl(event.currentTarget);
    setMenuMedication(medication);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuMedication(null);
  };

  const handleEdit = () => {
    setSelectedMedication(menuMedication);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleOpenAction = (type: 'discontinue' | 'hold' | 'pause' | 'cancel') => {
    setActionType(type);
    setSelectedMedication(menuMedication);
    setActionDialogOpen(true);
    handleMenuClose();
  };

  const handleResume = async () => {
    if (!menuMedication) return;
    try {
      await resumeMedication(patientId, menuMedication.id);
      openSnackbar({
        open: true,
        message: 'Medication resumed successfully',
        variant: 'alert',
        alert: { color: 'success' }
      } as SnackbarProps);
      fetchMedications();
    } catch (error) {
      openSnackbar({
        open: true,
        message: 'Failed to resume medication',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    }
    handleMenuClose();
  };

  const handleActionSubmit = async () => {
    if (!selectedMedication || !actionType) return;

    setActionLoading(true);
    try {
      switch (actionType) {
        case 'discontinue':
          await discontinueMedication(patientId, selectedMedication.id, actionReason);
          break;
        case 'hold':
          await holdMedication(patientId, selectedMedication.id, actionReason, actionDate || undefined);
          break;
        case 'pause':
          await pauseMedication(patientId, selectedMedication.id, actionReason, actionDate || undefined);
          break;
        case 'cancel':
          await cancelMedication(patientId, selectedMedication.id, actionReason);
          break;
      }

      openSnackbar({
        open: true,
        message: `Medication ${actionType}d successfully`,
        variant: 'alert',
        alert: { color: 'success' }
      } as SnackbarProps);

      setActionDialogOpen(false);
      setActionReason('');
      setActionDate('');
      setSelectedMedication(null);
      fetchMedications();
    } catch (error) {
      openSnackbar({
        open: true,
        message: `Failed to ${actionType} medication`,
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusChip = (status: MedicationStatus) => {
    const statusConfig = MEDICATION_STATUSES.find(s => s.value === status);
    return (
      <Chip
        size="small"
        label={statusConfig?.label || status}
        color={statusConfig?.color as any || 'default'}
      />
    );
  };

  const getRouteLabel = (route: string) => {
    return MEDICATION_ROUTES.find(r => r.value === route)?.label || route;
  };

  const getFrequencyLabel = (freq: string) => {
    return MEDICATION_FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <>
      <MainCard
        title="Medications"
        secondary={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedMedication(null);
              setFormOpen(true);
            }}
          >
            Add Medication
          </Button>
        }
      >
        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status Filter</InputLabel>
              <Select
                value={statusFilter}
                label="Status Filter"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {MEDICATION_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Hospice Related</InputLabel>
              <Select
                value={hospiceFilter}
                label="Hospice Related"
                onChange={(e) => {
                  setHospiceFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Hospice Related</MenuItem>
                <MenuItem value="false">Non-Hospice</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Medication</TableCell>
                <TableCell>Dosage</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Frequency</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Controlled</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="textSecondary">No medications found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                medications.map((medication) => (
                  <TableRow key={medication.id} hover>
                    <TableCell>
                      <Stack>
                        <Typography variant="subtitle2">{medication.medication_name}</Typography>
                        {medication.generic_name && (
                          <Typography variant="caption" color="textSecondary">
                            ({medication.generic_name})
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{medication.dosage}</TableCell>
                    <TableCell>{getRouteLabel(medication.medication_route)}</TableCell>
                    <TableCell>{getFrequencyLabel(medication.frequency)}</TableCell>
                    <TableCell>{formatDate(medication.start_date)}</TableCell>
                    <TableCell>{getStatusChip(medication.medication_status)}</TableCell>
                    <TableCell align="center">
                      {medication.controlled_schedule ? (
                        <Tooltip title={medication.controlled_schedule.replace('_', ' ')}>
                          <Warning2 size={18} color={theme.palette.warning.main} />
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, medication)}
                      >
                        <More size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </MainCard>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit} disabled={menuMedication?.medication_status === 'DISCONTINUED'}>
          <Edit2 size={16} style={{ marginRight: 8 }} />
          Edit
        </MenuItem>
        {(menuMedication?.medication_status === 'PAUSED' || menuMedication?.medication_status === 'HELD') ? (
          <MenuItem onClick={handleResume}>
            <Play size={16} style={{ marginRight: 8 }} />
            Resume
          </MenuItem>
        ) : (
          <>
            <MenuItem
              onClick={() => handleOpenAction('hold')}
              disabled={menuMedication?.medication_status !== 'ACTIVE'}
            >
              <Pause size={16} style={{ marginRight: 8 }} />
              Hold
            </MenuItem>
            <MenuItem
              onClick={() => handleOpenAction('pause')}
              disabled={menuMedication?.medication_status !== 'ACTIVE'}
            >
              <Pause size={16} style={{ marginRight: 8 }} />
              Pause
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={() => handleOpenAction('discontinue')}
          disabled={menuMedication?.medication_status === 'DISCONTINUED'}
        >
          <Trash size={16} style={{ marginRight: 8, color: theme.palette.error.main }} />
          <Typography color="error">Discontinue</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleOpenAction('cancel')}>
          <Trash size={16} style={{ marginRight: 8, color: theme.palette.error.main }} />
          <Typography color="error">Cancel Order</Typography>
        </MenuItem>
      </Menu>

      {/* Medication Form Dialog */}
      <MedicationOrderForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        patientId={patientId}
        medication={selectedMedication}
        onSuccess={fetchMedications}
      />

      {/* Action Dialog (Discontinue/Hold/Pause/Cancel) */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textTransform: 'capitalize' }}>
          {actionType} Medication
        </DialogTitle>
        <DialogContent>
          {selectedMedication && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {selectedMedication.medication_name} - {selectedMedication.dosage}
            </Alert>
          )}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Reason"
              multiline
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              required
              placeholder={`Enter reason for ${actionType}ing this medication`}
            />
            {(actionType === 'hold' || actionType === 'pause') && (
              <TextField
                fullWidth
                type="date"
                label={actionType === 'hold' ? 'Hold Until' : 'Pause Until'}
                value={actionDate}
                onChange={(e) => setActionDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={actionType === 'discontinue' || actionType === 'cancel' ? 'error' : 'primary'}
            onClick={handleActionSubmit}
            disabled={!actionReason || actionLoading}
          >
            {actionLoading ? 'Processing...' : `Confirm ${actionType}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MedicationList;
