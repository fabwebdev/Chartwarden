import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MainCard from 'components/MainCard';
import { openSnackbar } from 'api/snackbar';
import { SnackbarProps } from 'types/snackbar';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Add, Edit2, Clock, TickCircle, CloseCircle, InfoCircle } from 'iconsax-react';
import { format, startOfDay, endOfDay, addDays, subDays } from 'date-fns';

import {
  MAREntry,
  Medication,
  MedicationScheduleItem,
  getPatientMAR,
  getMedicationSchedule,
  createMAREntry,
  updateMAREntry,
  getPatientMedications,
  MAR_STATUSES,
  MARStatus,
  CreateMAREntryRequest
} from 'api/medication';

interface MedicationAdministrationRecordProps {
  patientId: string | number;
}

interface MARFormData {
  medication_id: number;
  medication_name?: string;
  scheduled_time: string;
  actual_time?: string;
  mar_status: MARStatus;
  dosage_given?: string;
  route_used?: string;
  reason_not_given?: string;
  patient_response?: string;
}

const MedicationAdministrationRecord = ({ patientId }: MedicationAdministrationRecordProps) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [schedule, setSchedule] = useState<MedicationScheduleItem[]>([]);
  const [marEntries, setMarEntries] = useState<{ mar_entry: MAREntry; medication: Medication }[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState<MARFormData | null>(null);
  const [editingEntry, setEditingEntry] = useState<MAREntry | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [scheduleRes, marRes, medsRes] = await Promise.all([
        getMedicationSchedule(patientId, dateStr),
        getPatientMAR(patientId, {
          start_date: format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss"),
          end_date: format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss")
        }),
        getPatientMedications(patientId, { status: 'ACTIVE', limit: 100 })
      ]);

      setSchedule(scheduleRes.data?.schedule || []);
      setMarEntries(marRes.data || []);
      setMedications(medsRes.data || []);
    } catch (error) {
      console.error('Error fetching MAR data:', error);
      openSnackbar({
        open: true,
        message: 'Failed to load MAR data',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setLoading(false);
    }
  }, [patientId, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenForm = (scheduleItem?: MedicationScheduleItem) => {
    if (scheduleItem) {
      setFormData({
        medication_id: scheduleItem.medication_id,
        medication_name: scheduleItem.medication_name,
        scheduled_time: scheduleItem.scheduled_time,
        actual_time: new Date().toISOString(),
        mar_status: 'GIVEN',
        dosage_given: scheduleItem.dosage,
        route_used: scheduleItem.route
      });
    } else {
      setFormData({
        medication_id: 0,
        scheduled_time: new Date().toISOString(),
        actual_time: new Date().toISOString(),
        mar_status: 'GIVEN'
      });
    }
    setEditingEntry(null);
    setFormOpen(true);
  };

  const handleEditEntry = (entry: MAREntry) => {
    setFormData({
      medication_id: entry.medication_id,
      scheduled_time: entry.scheduled_time,
      actual_time: entry.actual_time,
      mar_status: entry.mar_status,
      dosage_given: entry.dosage_given,
      route_used: entry.route_used,
      reason_not_given: entry.reason_not_given,
      patient_response: entry.patient_response
    });
    setEditingEntry(entry);
    setFormOpen(true);
  };

  const handleFormSubmit = async () => {
    if (!formData) return;

    // Validate required fields
    if (!formData.medication_id) {
      openSnackbar({
        open: true,
        message: 'Please select a medication',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
      return;
    }

    if (['NOT_GIVEN', 'REFUSED', 'HELD'].includes(formData.mar_status) && !formData.reason_not_given) {
      openSnackbar({
        open: true,
        message: 'Reason is required when medication is not given',
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
      return;
    }

    setFormLoading(true);
    try {
      if (editingEntry) {
        await updateMAREntry(patientId, editingEntry.id, {
          actual_time: formData.actual_time,
          mar_status: formData.mar_status,
          dosage_given: formData.dosage_given,
          route_used: formData.route_used,
          reason_not_given: formData.reason_not_given,
          patient_response: formData.patient_response
        });
      } else {
        const payload: CreateMAREntryRequest = {
          medication_id: formData.medication_id,
          scheduled_time: formData.scheduled_time,
          actual_time: formData.actual_time,
          mar_status: formData.mar_status,
          dosage_given: formData.dosage_given,
          route_used: formData.route_used,
          reason_not_given: formData.reason_not_given,
          patient_response: formData.patient_response
        };
        await createMAREntry(patientId, payload);
      }

      openSnackbar({
        open: true,
        message: editingEntry ? 'MAR entry updated' : 'Medication administration recorded',
        variant: 'alert',
        alert: { color: 'success' }
      } as SnackbarProps);

      setFormOpen(false);
      setFormData(null);
      setEditingEntry(null);
      fetchData();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to save MAR entry';
      openSnackbar({
        open: true,
        message,
        variant: 'alert',
        alert: { color: 'error' }
      } as SnackbarProps);
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusChip = (status: MARStatus) => {
    const config = MAR_STATUSES.find(s => s.value === status);
    return (
      <Chip
        size="small"
        label={config?.label || status}
        color={config?.color as any || 'default'}
        icon={status === 'GIVEN' ? <TickCircle size={14} /> : status === 'REFUSED' ? <CloseCircle size={14} /> : undefined}
      />
    );
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'MM/dd/yyyy HH:mm');
  };

  // Check if a scheduled item has a MAR entry
  const getMarEntryForSchedule = (scheduleItem: MedicationScheduleItem) => {
    return marEntries.find(
      entry =>
        entry.mar_entry.medication_id === scheduleItem.medication_id &&
        entry.mar_entry.scheduled_time === scheduleItem.scheduled_time
    );
  };

  // Combine schedule with recorded entries for display
  const combinedData = schedule.map(item => ({
    ...item,
    marEntry: getMarEntryForSchedule(item)
  }));

  // Add any MAR entries that aren't in the schedule (PRN, etc.)
  const additionalEntries = marEntries.filter(
    entry => !schedule.find(
      s => s.medication_id === entry.mar_entry.medication_id &&
           s.scheduled_time === entry.mar_entry.scheduled_time
    )
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MainCard
        title="Medication Administration Record (MAR)"
        secondary={
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              size="small"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            >
              Previous Day
            </Button>
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              slotProps={{
                textField: { size: 'small', sx: { width: 150 } }
              }}
            />
            <Button
              size="small"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            >
              Next Day
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenForm()}
            >
              Record Administration
            </Button>
          </Stack>
        }
      >
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Scheduled Time</TableCell>
                <TableCell>Medication</TableCell>
                <TableCell>Dosage</TableCell>
                <TableCell>Route</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actual Time</TableCell>
                <TableCell>Administered By</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : combinedData.length === 0 && additionalEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography color="textSecondary">No scheduled medications for this date</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Scheduled items */}
                  {combinedData.map((item, index) => (
                    <TableRow
                      key={`schedule-${index}`}
                      hover
                      sx={{
                        backgroundColor: item.marEntry
                          ? undefined
                          : new Date(item.scheduled_time) < new Date()
                            ? theme.palette.warning.lighter
                            : undefined
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Clock size={16} />
                          <Typography>{formatTime(item.scheduled_time)}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack>
                          <Typography variant="subtitle2">{item.medication_name}</Typography>
                          {item.is_prn && (
                            <Chip size="small" label="PRN" color="info" sx={{ width: 'fit-content' }} />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{item.dosage}</TableCell>
                      <TableCell>{item.route}</TableCell>
                      <TableCell>
                        {item.marEntry ? (
                          getStatusChip(item.marEntry.mar_entry.mar_status)
                        ) : (
                          <Chip size="small" label="Pending" color="default" />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.marEntry ? formatTime(item.marEntry.mar_entry.actual_time!) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.marEntry?.mar_entry.administered_by_name || '-'}
                      </TableCell>
                      <TableCell>
                        {item.marEntry?.mar_entry.reason_not_given && (
                          <Tooltip title={item.marEntry.mar_entry.reason_not_given}>
                            <InfoCircle size={16} color={theme.palette.warning.main} />
                          </Tooltip>
                        )}
                        {item.marEntry?.mar_entry.patient_response && (
                          <Typography variant="caption" noWrap sx={{ maxWidth: 150, display: 'block' }}>
                            {item.marEntry.mar_entry.patient_response}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {item.marEntry ? (
                          <IconButton
                            size="small"
                            onClick={() => handleEditEntry(item.marEntry!.mar_entry)}
                          >
                            <Edit2 size={16} />
                          </IconButton>
                        ) : (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenForm(item)}
                          >
                            Record
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Additional entries (PRN or manually added) */}
                  {additionalEntries.map((entry, index) => (
                    <TableRow key={`additional-${index}`} hover>
                      <TableCell>
                        <Typography color="textSecondary">{formatTime(entry.mar_entry.scheduled_time)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {entry.medication?.medication_name || 'Unknown Medication'}
                        </Typography>
                      </TableCell>
                      <TableCell>{entry.mar_entry.dosage_given || '-'}</TableCell>
                      <TableCell>{entry.mar_entry.route_used || '-'}</TableCell>
                      <TableCell>{getStatusChip(entry.mar_entry.mar_status)}</TableCell>
                      <TableCell>{entry.mar_entry.actual_time ? formatTime(entry.mar_entry.actual_time) : '-'}</TableCell>
                      <TableCell>{entry.mar_entry.administered_by_name || '-'}</TableCell>
                      <TableCell>
                        {entry.mar_entry.patient_response || entry.mar_entry.reason_not_given || '-'}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleEditEntry(entry.mar_entry)}
                        >
                          <Edit2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Summary Stats */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {marEntries.filter(e => e.mar_entry.mar_status === 'GIVEN').length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Given</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {combinedData.filter(item => !item.marEntry && new Date(item.scheduled_time) < new Date()).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Pending/Overdue</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {marEntries.filter(e => ['REFUSED', 'NOT_GIVEN', 'MISSED'].includes(e.mar_entry.mar_status)).length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Not Given/Refused</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {schedule.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">Total Scheduled</Typography>
            </Paper>
          </Grid>
        </Grid>
      </MainCard>

      {/* MAR Entry Form Dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingEntry ? 'Edit MAR Entry' : 'Record Medication Administration'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Medication Selection (only for new entries without schedule) */}
            {!formData?.medication_name && !editingEntry && (
              <FormControl fullWidth>
                <InputLabel>Medication *</InputLabel>
                <Select
                  value={formData?.medication_id || ''}
                  label="Medication *"
                  onChange={(e) => setFormData(prev => prev ? { ...prev, medication_id: Number(e.target.value) } : null)}
                >
                  {medications.map((med) => (
                    <MenuItem key={med.id} value={med.id}>
                      {med.medication_name} - {med.dosage}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Display selected medication */}
            {formData?.medication_name && (
              <Alert severity="info">
                <Typography variant="subtitle2">{formData.medication_name}</Typography>
                <Typography variant="caption">
                  Scheduled: {formData.scheduled_time ? formatDateTime(formData.scheduled_time) : 'N/A'}
                </Typography>
              </Alert>
            )}

            {/* Status */}
            <FormControl fullWidth>
              <InputLabel>Administration Status *</InputLabel>
              <Select
                value={formData?.mar_status || 'GIVEN'}
                label="Administration Status *"
                onChange={(e) => setFormData(prev => prev ? { ...prev, mar_status: e.target.value as MARStatus } : null)}
              >
                {MAR_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Chip size="small" label={status.label} color={status.color as any} sx={{ mr: 1 }} />
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Actual Time */}
            <TextField
              fullWidth
              type="datetime-local"
              label="Actual Time"
              value={formData?.actual_time ? format(new Date(formData.actual_time), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, actual_time: new Date(e.target.value).toISOString() } : null)}
              InputLabelProps={{ shrink: true }}
            />

            {/* Dosage Given */}
            <TextField
              fullWidth
              label="Dosage Given"
              value={formData?.dosage_given || ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, dosage_given: e.target.value } : null)}
              placeholder="e.g., 500mg"
            />

            {/* Route Used */}
            <TextField
              fullWidth
              label="Route Used"
              value={formData?.route_used || ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, route_used: e.target.value } : null)}
              placeholder="e.g., Oral, IV"
            />

            {/* Reason Not Given (required for certain statuses) */}
            {formData && ['NOT_GIVEN', 'REFUSED', 'HELD'].includes(formData.mar_status) && (
              <TextField
                fullWidth
                label="Reason Not Given *"
                multiline
                rows={2}
                value={formData?.reason_not_given || ''}
                onChange={(e) => setFormData(prev => prev ? { ...prev, reason_not_given: e.target.value } : null)}
                required
                error={!formData?.reason_not_given}
                helperText={!formData?.reason_not_given ? 'Reason is required' : ''}
              />
            )}

            {/* Patient Response */}
            <TextField
              fullWidth
              label="Patient Response"
              multiline
              rows={2}
              value={formData?.patient_response || ''}
              onChange={(e) => setFormData(prev => prev ? { ...prev, patient_response: e.target.value } : null)}
              placeholder="Document patient's response to medication"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={formLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={formLoading}
          >
            {formLoading ? 'Saving...' : editingEntry ? 'Update' : 'Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MedicationAdministrationRecord;
