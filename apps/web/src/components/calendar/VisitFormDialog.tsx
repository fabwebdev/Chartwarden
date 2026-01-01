'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import { format, parseISO, setHours, setMinutes } from 'date-fns';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Swal from 'sweetalert2';
import { Calendar, Clock, User, Warning2 } from 'iconsax-react';
import {
  ScheduledVisit,
  SchedulingConflict,
  createScheduledVisit,
  createScheduledVisitStrict,
  updateScheduledVisit,
  getAvailableSlots,
  checkStaffAvailability,
  detectConflicts,
  VISIT_TYPES,
  VISIT_PURPOSES,
  AvailableSlot,
  getVisitTypeColor
} from '../../api/scheduling';
import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

interface VisitFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (visit: ScheduledVisit) => void;
  visit?: ScheduledVisit | null;
  initialDate?: Date | null;
  initialHour?: number | null;
  staffId?: number;
  patientId?: number;
}

interface StaffOption {
  id: number;
  name: string;
  discipline?: string;
}

interface PatientOption {
  id: number;
  name: string;
  mrn?: string;
}

// ==============================|| VALIDATION SCHEMA ||============================== //

const validationSchema = Yup.object().shape({
  patient_id: Yup.number().required('Patient is required'),
  staff_id: Yup.number().required('Staff member is required'),
  visit_type: Yup.string().required('Visit type is required'),
  visit_purpose: Yup.string(),
  scheduled_date: Yup.string().required('Date is required'),
  scheduled_start_time: Yup.string().required('Start time is required'),
  scheduled_end_time: Yup.string(),
  estimated_duration_minutes: Yup.number().min(15, 'Minimum 15 minutes').max(480, 'Maximum 8 hours'),
  visit_notes: Yup.string()
});

// ==============================|| VISIT FORM DIALOG ||============================== //

const VisitFormDialog = ({
  open,
  onClose,
  onSave,
  visit,
  initialDate,
  initialHour,
  staffId,
  patientId
}: VisitFormDialogProps) => {
  const theme = useTheme();
  const isEditing = Boolean(visit);

  // State
  const [loading, setLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [strictMode, setStrictMode] = useState(false);

  // Format initial time
  const getInitialTime = () => {
    if (visit) {
      return visit.scheduled_start_time.substring(0, 5);
    }
    if (initialHour !== null && initialHour !== undefined) {
      return `${String(initialHour).padStart(2, '0')}:00`;
    }
    return '09:00';
  };

  // Formik
  const formik = useFormik({
    initialValues: {
      patient_id: visit?.patient_id || patientId || 0,
      staff_id: visit?.staff_id || staffId || 0,
      visit_type: visit?.visit_type || '',
      visit_purpose: visit?.visit_purpose || '',
      scheduled_date: visit?.scheduled_date || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
      scheduled_start_time: getInitialTime(),
      scheduled_end_time: visit?.scheduled_end_time?.substring(0, 5) || '',
      estimated_duration_minutes: visit?.estimated_duration_minutes || 60,
      visit_notes: visit?.visit_notes || '',
      billable: visit?.billable ?? true
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const visitData = {
          ...values,
          scheduled_start_time: `${values.scheduled_start_time}:00`,
          scheduled_end_time: values.scheduled_end_time ? `${values.scheduled_end_time}:00` : undefined
        };

        let response;
        if (isEditing && visit) {
          response = await updateScheduledVisit(visit.id, visitData);
        } else if (strictMode) {
          response = await createScheduledVisitStrict(visitData);
        } else {
          response = await createScheduledVisit(visitData);
        }

        if (response.conflicts && response.conflicts.length > 0) {
          const result = await Swal.fire({
            icon: 'warning',
            title: 'Scheduling Conflict',
            html: `
              <p>This visit has ${response.conflicts.length} conflict(s):</p>
              <ul style="text-align: left;">
                ${response.conflicts.map((c) => `<li>${c.conflict_description || c.conflict_type}</li>`).join('')}
              </ul>
              <p>The visit was created but you should resolve these conflicts.</p>
            `,
            confirmButtonText: 'OK'
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: isEditing ? 'Visit Updated' : 'Visit Scheduled',
            text: isEditing ? 'The visit has been updated successfully.' : 'The visit has been scheduled successfully.',
            timer: 2000,
            showConfirmButton: false
          });
        }

        onSave(response.data);
      } catch (error: any) {
        console.error('Error saving visit:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to save the visit. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    }
  });

  // Fetch staff options
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const response = await http.get('/staff');
        const staff = response.data?.data || response.data || [];
        setStaffOptions(
          staff.map((s: any) => ({
            id: s.id,
            name: `${s.first_name || ''} ${s.last_name || ''}`.trim() || `Staff #${s.id}`,
            discipline: s.discipline
          }))
        );
      } catch (error) {
        console.error('Error fetching staff:', error);
      }
    };
    if (open) {
      fetchStaff();
    }
  }, [open]);

  // Fetch patient options
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await http.get('/patients?limit=100');
        const patients = response.data?.data || response.data || [];
        setPatientOptions(
          patients.map((p: any) => ({
            id: p.id,
            name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Patient #${p.id}`,
            mrn: p.mrn
          }))
        );
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    if (open) {
      fetchPatients();
    }
  }, [open]);

  // Check availability when staff/date changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formik.values.staff_id || !formik.values.scheduled_date) return;

      setCheckingAvailability(true);
      try {
        const [slotsResponse, conflictsResponse] = await Promise.all([
          getAvailableSlots(formik.values.staff_id, formik.values.scheduled_date, formik.values.estimated_duration_minutes),
          detectConflicts(formik.values.staff_id, formik.values.scheduled_date)
        ]);

        setAvailableSlots(slotsResponse.data || []);
        setConflicts(conflictsResponse.data || []);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setCheckingAvailability(false);
      }
    };

    if (open && formik.values.staff_id && formik.values.scheduled_date) {
      checkAvailability();
    }
  }, [open, formik.values.staff_id, formik.values.scheduled_date, formik.values.estimated_duration_minutes]);

  // Calculate end time when start time or duration changes
  useEffect(() => {
    if (formik.values.scheduled_start_time && formik.values.estimated_duration_minutes) {
      const [hours, minutes] = formik.values.scheduled_start_time.split(':').map(Number);
      const startDate = setMinutes(setHours(new Date(), hours), minutes);
      const endDate = new Date(startDate.getTime() + formik.values.estimated_duration_minutes * 60000);
      formik.setFieldValue('scheduled_end_time', format(endDate, 'HH:mm'));
    }
  }, [formik.values.scheduled_start_time, formik.values.estimated_duration_minutes]);

  const handleClose = () => {
    formik.resetForm();
    setConflicts([]);
    setAvailableSlots([]);
    onClose();
  };

  const selectedStaff = staffOptions.find((s) => s.id === formik.values.staff_id);
  const selectedPatient = patientOptions.find((p) => p.id === formik.values.patient_id);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={formik.handleSubmit}>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Calendar size={24} />
            <Typography variant="h5">{isEditing ? 'Edit Visit' : 'Schedule New Visit'}</Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Patient Selection */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={patientOptions}
                getOptionLabel={(option) => `${option.name}${option.mrn ? ` (${option.mrn})` : ''}`}
                value={selectedPatient || null}
                onChange={(_, value) => formik.setFieldValue('patient_id', value?.id || 0)}
                disabled={Boolean(patientId)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Patient"
                    error={formik.touched.patient_id && Boolean(formik.errors.patient_id)}
                    helperText={formik.touched.patient_id && formik.errors.patient_id}
                    required
                  />
                )}
              />
            </Grid>

            {/* Staff Selection */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={staffOptions}
                getOptionLabel={(option) => `${option.name}${option.discipline ? ` (${option.discipline})` : ''}`}
                value={selectedStaff || null}
                onChange={(_, value) => formik.setFieldValue('staff_id', value?.id || 0)}
                disabled={Boolean(staffId)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Staff Member"
                    error={formik.touched.staff_id && Boolean(formik.errors.staff_id)}
                    helperText={formik.touched.staff_id && formik.errors.staff_id}
                    required
                  />
                )}
              />
            </Grid>

            {/* Visit Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={formik.touched.visit_type && Boolean(formik.errors.visit_type)}>
                <InputLabel required>Visit Type</InputLabel>
                <Select
                  name="visit_type"
                  value={formik.values.visit_type}
                  onChange={formik.handleChange}
                  label="Visit Type"
                >
                  {VISIT_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: 0.5,
                            backgroundColor: type.color
                          }}
                        />
                        <span>{type.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
                {formik.touched.visit_type && formik.errors.visit_type && (
                  <FormHelperText>{formik.errors.visit_type}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Visit Purpose */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Visit Purpose</InputLabel>
                <Select
                  name="visit_purpose"
                  value={formik.values.visit_purpose}
                  onChange={formik.handleChange}
                  label="Visit Purpose"
                >
                  {VISIT_PURPOSES.map((purpose) => (
                    <MenuItem key={purpose.value} value={purpose.value}>
                      {purpose.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                name="scheduled_date"
                label="Date"
                value={formik.values.scheduled_date}
                onChange={formik.handleChange}
                error={formik.touched.scheduled_date && Boolean(formik.errors.scheduled_date)}
                helperText={formik.touched.scheduled_date && formik.errors.scheduled_date}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Start Time */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="time"
                name="scheduled_start_time"
                label="Start Time"
                value={formik.values.scheduled_start_time}
                onChange={formik.handleChange}
                error={formik.touched.scheduled_start_time && Boolean(formik.errors.scheduled_start_time)}
                helperText={formik.touched.scheduled_start_time && formik.errors.scheduled_start_time}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Duration */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Duration</InputLabel>
                <Select
                  name="estimated_duration_minutes"
                  value={formik.values.estimated_duration_minutes}
                  onChange={formik.handleChange}
                  label="Duration"
                >
                  <MenuItem value={15}>15 minutes</MenuItem>
                  <MenuItem value={30}>30 minutes</MenuItem>
                  <MenuItem value={45}>45 minutes</MenuItem>
                  <MenuItem value={60}>1 hour</MenuItem>
                  <MenuItem value={90}>1.5 hours</MenuItem>
                  <MenuItem value={120}>2 hours</MenuItem>
                  <MenuItem value={180}>3 hours</MenuItem>
                  <MenuItem value={240}>4 hours</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Available Slots */}
            {availableSlots.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Available Time Slots
                  {checkingAvailability && <CircularProgress size={12} sx={{ ml: 1 }} />}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {availableSlots.slice(0, 8).map((slot, index) => (
                    <Chip
                      key={index}
                      label={`${slot.start_time.substring(0, 5)} - ${slot.end_time.substring(0, 5)}`}
                      size="small"
                      variant={formik.values.scheduled_start_time === slot.start_time.substring(0, 5) ? 'filled' : 'outlined'}
                      color={formik.values.scheduled_start_time === slot.start_time.substring(0, 5) ? 'primary' : 'default'}
                      onClick={() => formik.setFieldValue('scheduled_start_time', slot.start_time.substring(0, 5))}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Stack>
              </Grid>
            )}

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" icon={<Warning2 />}>
                  <Typography variant="subtitle2">
                    {conflicts.length} potential conflict(s) detected for this staff member on this date:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {conflicts.slice(0, 3).map((conflict, index) => (
                      <li key={index}>
                        <Typography variant="caption">
                          {conflict.conflict_description || `${conflict.conflict_type} at ${conflict.conflict_start_time}`}
                        </Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              </Grid>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                name="visit_notes"
                label="Visit Notes"
                value={formik.values.visit_notes}
                onChange={formik.handleChange}
                placeholder="Add any notes about this visit..."
              />
            </Grid>

            {/* Options */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formik.values.billable}
                      onChange={(e) => formik.setFieldValue('billable', e.target.checked)}
                    />
                  }
                  label="Billable"
                />
                {!isEditing && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={strictMode}
                        onChange={(e) => setStrictMode(e.target.checked)}
                        color="warning"
                      />
                    }
                    label="Strict Mode (reject if conflicts exist)"
                  />
                )}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !formik.isValid}>
            {loading ? <CircularProgress size={20} /> : isEditing ? 'Update Visit' : 'Schedule Visit'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default VisitFormDialog;
