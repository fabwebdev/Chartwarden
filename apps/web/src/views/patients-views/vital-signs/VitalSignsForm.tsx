'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  Divider,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

// Constants for dropdown options
const TEMPERATURE_METHODS = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'AXILLARY', label: 'Axillary' },
  { value: 'RECTAL', label: 'Rectal' },
  { value: 'TEMPORAL', label: 'Temporal' },
  { value: 'TYMPANIC', label: 'Tympanic' },
  { value: 'OTHER', label: 'Other' }
];

const HEART_RHYTHMS = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'IRREGULAR', label: 'Irregular' },
  { value: 'REGULARLY_IRREGULAR', label: 'Regularly Irregular' },
  { value: 'IRREGULARLY_IRREGULAR', label: 'Irregularly Irregular' }
];

const BP_POSITIONS = [
  { value: 'SITTING', label: 'Sitting' },
  { value: 'STANDING', label: 'Standing' },
  { value: 'SUPINE', label: 'Supine' },
  { value: 'LEFT_LATERAL', label: 'Left Lateral' }
];

const BP_LOCATIONS = [
  { value: 'LEFT_ARM', label: 'Left Arm' },
  { value: 'RIGHT_ARM', label: 'Right Arm' },
  { value: 'LEFT_LEG', label: 'Left Leg' },
  { value: 'RIGHT_LEG', label: 'Right Leg' }
];

const RESPIRATORY_RHYTHMS = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'IRREGULAR', label: 'Irregular' },
  { value: 'CHEYNE_STOKES', label: 'Cheyne-Stokes' },
  { value: 'KUSSMAUL', label: 'Kussmaul' },
  { value: 'BIOTS', label: "Biot's" }
];

const OXYGEN_DELIVERY_METHODS = [
  { value: 'NASAL_CANNULA', label: 'Nasal Cannula' },
  { value: 'MASK', label: 'Simple Mask' },
  { value: 'VENTI_MASK', label: 'Venturi Mask' },
  { value: 'NON_REBREATHER', label: 'Non-Rebreather' },
  { value: 'HIGH_FLOW', label: 'High Flow' }
];

const PAIN_SCALES = [
  { value: 'NRS', label: 'Numeric Rating Scale (0-10)' },
  { value: 'VAS', label: 'Visual Analog Scale' },
  { value: 'FACES', label: 'Wong-Baker FACES' },
  { value: 'FLACC', label: 'FLACC (Pediatric)' },
  { value: 'PAINAD', label: 'PAINAD (Dementia)' },
  { value: 'CPOT', label: 'CPOT (Critical Care)' }
];

// Validation ranges
const VITAL_SIGN_VALID_RANGES = {
  temperature_fahrenheit: { min: 95.0, max: 106.0 },
  bp_systolic: { min: 70, max: 200 },
  bp_diastolic: { min: 40, max: 130 },
  heart_rate: { min: 40, max: 200 },
  respiratory_rate: { min: 8, max: 40 },
  oxygen_saturation: { min: 70, max: 100 }
};

interface VitalSignsFormData {
  measurement_timestamp: Dayjs | null;
  // Temperature
  degrees_fahrenheit: string;
  temperature_method: string;
  temperature_notes: string;
  // Heart Rate
  heart_rate: string;
  heart_rhythm: string;
  heart_rate_notes: string;
  // Blood Pressure
  bp_systolic: string;
  bp_diastolic: string;
  bp_position: string;
  bp_location: string;
  bp_notes: string;
  // Respiratory
  respiratory_rate: string;
  respiratory_rhythm: string;
  respiratory_notes: string;
  // Oxygen Saturation
  pulse_oximetry_percentage: string;
  supplemental_oxygen: boolean;
  oxygen_flow_rate: string;
  oxygen_delivery_method: string;
  pulse_ox_notes: string;
  // Pain
  pain_score: string;
  pain_scale_used: string;
  pain_location: string;
  pain_notes: string;
  // General
  general_notes: string;
}

const initialFormData: VitalSignsFormData = {
  measurement_timestamp: dayjs(),
  degrees_fahrenheit: '',
  temperature_method: 'ORAL',
  temperature_notes: '',
  heart_rate: '',
  heart_rhythm: 'REGULAR',
  heart_rate_notes: '',
  bp_systolic: '',
  bp_diastolic: '',
  bp_position: 'SITTING',
  bp_location: 'LEFT_ARM',
  bp_notes: '',
  respiratory_rate: '',
  respiratory_rhythm: 'REGULAR',
  respiratory_notes: '',
  pulse_oximetry_percentage: '',
  supplemental_oxygen: false,
  oxygen_flow_rate: '',
  oxygen_delivery_method: '',
  pulse_ox_notes: '',
  pain_score: '',
  pain_scale_used: 'NRS',
  pain_location: '',
  pain_notes: '',
  general_notes: ''
};

interface VitalSignsFormProps {
  patientId: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<VitalSignsFormData>;
}

const VitalSignsForm = ({
  patientId,
  onSubmit,
  onCancel,
  isLoading = false,
  initialData
}: VitalSignsFormProps) => {
  const [formData, setFormData] = useState<VitalSignsFormData>({
    ...initialFormData,
    ...initialData
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof VitalSignsFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handleCheckboxChange = useCallback((field: keyof VitalSignsFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: event.target.checked }));
  }, []);

  const handleDateChange = useCallback((value: Dayjs | null) => {
    setFormData(prev => ({ ...prev, measurement_timestamp: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Check that at least one vital sign is entered
    const hasAnyVital =
      formData.degrees_fahrenheit ||
      formData.heart_rate ||
      formData.bp_systolic ||
      formData.bp_diastolic ||
      formData.respiratory_rate ||
      formData.pulse_oximetry_percentage ||
      formData.pain_score;

    if (!hasAnyVital) {
      newErrors.general = 'At least one vital sign measurement is required';
    }

    // Validate temperature
    if (formData.degrees_fahrenheit) {
      const temp = parseFloat(formData.degrees_fahrenheit);
      if (isNaN(temp) || temp < VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.min || temp > VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.max) {
        newErrors.degrees_fahrenheit = `Temperature must be between ${VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.min} and ${VITAL_SIGN_VALID_RANGES.temperature_fahrenheit.max} F`;
      }
    }

    // Validate heart rate
    if (formData.heart_rate) {
      const hr = parseInt(formData.heart_rate);
      if (isNaN(hr) || hr < VITAL_SIGN_VALID_RANGES.heart_rate.min || hr > VITAL_SIGN_VALID_RANGES.heart_rate.max) {
        newErrors.heart_rate = `Heart rate must be between ${VITAL_SIGN_VALID_RANGES.heart_rate.min} and ${VITAL_SIGN_VALID_RANGES.heart_rate.max} BPM`;
      }
    }

    // Validate blood pressure
    if (formData.bp_systolic) {
      const sys = parseInt(formData.bp_systolic);
      if (isNaN(sys) || sys < VITAL_SIGN_VALID_RANGES.bp_systolic.min || sys > VITAL_SIGN_VALID_RANGES.bp_systolic.max) {
        newErrors.bp_systolic = `Systolic BP must be between ${VITAL_SIGN_VALID_RANGES.bp_systolic.min} and ${VITAL_SIGN_VALID_RANGES.bp_systolic.max} mmHg`;
      }
    }
    if (formData.bp_diastolic) {
      const dia = parseInt(formData.bp_diastolic);
      if (isNaN(dia) || dia < VITAL_SIGN_VALID_RANGES.bp_diastolic.min || dia > VITAL_SIGN_VALID_RANGES.bp_diastolic.max) {
        newErrors.bp_diastolic = `Diastolic BP must be between ${VITAL_SIGN_VALID_RANGES.bp_diastolic.min} and ${VITAL_SIGN_VALID_RANGES.bp_diastolic.max} mmHg`;
      }
    }
    if (formData.bp_systolic && formData.bp_diastolic) {
      const sys = parseInt(formData.bp_systolic);
      const dia = parseInt(formData.bp_diastolic);
      if (!isNaN(sys) && !isNaN(dia) && dia >= sys) {
        newErrors.bp_diastolic = 'Diastolic BP must be less than systolic BP';
      }
    }

    // Validate respiratory rate
    if (formData.respiratory_rate) {
      const rr = parseInt(formData.respiratory_rate);
      if (isNaN(rr) || rr < VITAL_SIGN_VALID_RANGES.respiratory_rate.min || rr > VITAL_SIGN_VALID_RANGES.respiratory_rate.max) {
        newErrors.respiratory_rate = `Respiratory rate must be between ${VITAL_SIGN_VALID_RANGES.respiratory_rate.min} and ${VITAL_SIGN_VALID_RANGES.respiratory_rate.max} breaths/min`;
      }
    }

    // Validate oxygen saturation
    if (formData.pulse_oximetry_percentage) {
      const spo2 = parseFloat(formData.pulse_oximetry_percentage);
      if (isNaN(spo2) || spo2 < VITAL_SIGN_VALID_RANGES.oxygen_saturation.min || spo2 > VITAL_SIGN_VALID_RANGES.oxygen_saturation.max) {
        newErrors.pulse_oximetry_percentage = `SpO2 must be between ${VITAL_SIGN_VALID_RANGES.oxygen_saturation.min} and ${VITAL_SIGN_VALID_RANGES.oxygen_saturation.max}%`;
      }
    }

    // Validate pain score
    if (formData.pain_score) {
      const pain = parseInt(formData.pain_score);
      if (isNaN(pain) || pain < 0 || pain > 10) {
        newErrors.pain_score = 'Pain score must be between 0 and 10';
      }
    }

    // Validate timestamp
    if (!formData.measurement_timestamp) {
      newErrors.measurement_timestamp = 'Measurement time is required';
    } else if (formData.measurement_timestamp.isAfter(dayjs())) {
      newErrors.measurement_timestamp = 'Measurement time cannot be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      const submitData: any = {
        patient_id: parseInt(patientId),
        measurement_timestamp: formData.measurement_timestamp?.toISOString()
      };

      // Only include fields that have values
      if (formData.degrees_fahrenheit) {
        submitData.degrees_fahrenheit = parseFloat(formData.degrees_fahrenheit);
        submitData.temperature_method = formData.temperature_method;
        submitData.temperature_unit = 'F';
        if (formData.temperature_notes) submitData.temperature_notes = formData.temperature_notes;
      }

      if (formData.heart_rate) {
        submitData.heart_rate = parseInt(formData.heart_rate);
        submitData.heart_rhythm = formData.heart_rhythm;
        if (formData.heart_rate_notes) submitData.heart_rate_notes = formData.heart_rate_notes;
      }

      if (formData.bp_systolic || formData.bp_diastolic) {
        if (formData.bp_systolic) submitData.bp_systolic = parseInt(formData.bp_systolic);
        if (formData.bp_diastolic) submitData.bp_diastolic = parseInt(formData.bp_diastolic);
        submitData.bp_position = formData.bp_position;
        submitData.bp_location = formData.bp_location;
        if (formData.bp_notes) submitData.bp_notes = formData.bp_notes;
      }

      if (formData.respiratory_rate) {
        submitData.respiratory_rate = parseInt(formData.respiratory_rate);
        submitData.respiratory_rhythm = formData.respiratory_rhythm;
        if (formData.respiratory_notes) submitData.respiratory_notes = formData.respiratory_notes;
      }

      if (formData.pulse_oximetry_percentage) {
        submitData.pulse_oximetry_percentage = parseFloat(formData.pulse_oximetry_percentage);
        submitData.supplemental_oxygen = formData.supplemental_oxygen;
        if (formData.supplemental_oxygen) {
          if (formData.oxygen_flow_rate) submitData.oxygen_flow_rate = parseFloat(formData.oxygen_flow_rate);
          if (formData.oxygen_delivery_method) submitData.oxygen_delivery_method = formData.oxygen_delivery_method;
        }
        if (formData.pulse_ox_notes) submitData.pulse_ox_notes = formData.pulse_ox_notes;
      }

      if (formData.pain_score) {
        submitData.pain_score = parseInt(formData.pain_score);
        submitData.pain_scale_used = formData.pain_scale_used;
        if (formData.pain_location) submitData.pain_location = formData.pain_location;
        if (formData.pain_notes) submitData.pain_notes = formData.pain_notes;
      }

      if (formData.general_notes) {
        submitData.general_notes = formData.general_notes;
      }

      await onSubmit(submitData);

      // Reset form on success
      setFormData({ ...initialFormData, measurement_timestamp: dayjs() });
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to save vital signs');
    }
  }, [formData, patientId, onSubmit, validateForm]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Paper elevation={0} sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Header */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                Record Vital Signs
              </Typography>
              {submitError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {submitError}
                </Alert>
              )}
              {errors.general && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {errors.general}
                </Alert>
              )}
            </Grid>

            {/* Measurement Time */}
            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="Measurement Date/Time"
                value={formData.measurement_timestamp}
                onChange={handleDateChange}
                maxDateTime={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.measurement_timestamp,
                    helperText: errors.measurement_timestamp
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Temperature Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Temperature
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Temperature"
                type="number"
                value={formData.degrees_fahrenheit}
                onChange={handleChange('degrees_fahrenheit')}
                error={!!errors.degrees_fahrenheit}
                helperText={errors.degrees_fahrenheit}
                InputProps={{
                  endAdornment: <InputAdornment position="end">°F</InputAdornment>,
                  inputProps: { step: 0.1 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Method</InputLabel>
                <Select
                  value={formData.temperature_method}
                  label="Method"
                  onChange={handleChange('temperature_method') as any}
                >
                  {TEMPERATURE_METHODS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Temperature Notes"
                value={formData.temperature_notes}
                onChange={handleChange('temperature_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Heart Rate Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Heart Rate
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Heart Rate"
                type="number"
                value={formData.heart_rate}
                onChange={handleChange('heart_rate')}
                error={!!errors.heart_rate}
                helperText={errors.heart_rate}
                InputProps={{
                  endAdornment: <InputAdornment position="end">BPM</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Rhythm</InputLabel>
                <Select
                  value={formData.heart_rhythm}
                  label="Rhythm"
                  onChange={handleChange('heart_rhythm') as any}
                >
                  {HEART_RHYTHMS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Heart Rate Notes"
                value={formData.heart_rate_notes}
                onChange={handleChange('heart_rate_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Blood Pressure Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Blood Pressure
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Systolic"
                type="number"
                value={formData.bp_systolic}
                onChange={handleChange('bp_systolic')}
                error={!!errors.bp_systolic}
                helperText={errors.bp_systolic}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mmHg</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="Diastolic"
                type="number"
                value={formData.bp_diastolic}
                onChange={handleChange('bp_diastolic')}
                error={!!errors.bp_diastolic}
                helperText={errors.bp_diastolic}
                InputProps={{
                  endAdornment: <InputAdornment position="end">mmHg</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Position</InputLabel>
                <Select
                  value={formData.bp_position}
                  label="Position"
                  onChange={handleChange('bp_position') as any}
                >
                  {BP_POSITIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={formData.bp_location}
                  label="Location"
                  onChange={handleChange('bp_location') as any}
                >
                  {BP_LOCATIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Blood Pressure Notes"
                value={formData.bp_notes}
                onChange={handleChange('bp_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Respiratory Rate Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Respiratory Rate
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Respiratory Rate"
                type="number"
                value={formData.respiratory_rate}
                onChange={handleChange('respiratory_rate')}
                error={!!errors.respiratory_rate}
                helperText={errors.respiratory_rate}
                InputProps={{
                  endAdornment: <InputAdornment position="end">breaths/min</InputAdornment>
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Rhythm</InputLabel>
                <Select
                  value={formData.respiratory_rhythm}
                  label="Rhythm"
                  onChange={handleChange('respiratory_rhythm') as any}
                >
                  {RESPIRATORY_RHYTHMS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Respiratory Notes"
                value={formData.respiratory_notes}
                onChange={handleChange('respiratory_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Oxygen Saturation Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Oxygen Saturation (SpO2)
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="SpO2"
                type="number"
                value={formData.pulse_oximetry_percentage}
                onChange={handleChange('pulse_oximetry_percentage')}
                error={!!errors.pulse_oximetry_percentage}
                helperText={errors.pulse_oximetry_percentage}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { step: 0.1 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.supplemental_oxygen}
                    onChange={handleCheckboxChange('supplemental_oxygen')}
                  />
                }
                label="Supplemental O2"
                sx={{ mt: 1 }}
              />
            </Grid>
            {formData.supplemental_oxygen && (
              <>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    label="O2 Flow Rate"
                    type="number"
                    value={formData.oxygen_flow_rate}
                    onChange={handleChange('oxygen_flow_rate')}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">L/min</InputAdornment>,
                      inputProps: { step: 0.5 }
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth>
                    <InputLabel>Delivery Method</InputLabel>
                    <Select
                      value={formData.oxygen_delivery_method}
                      label="Delivery Method"
                      onChange={handleChange('oxygen_delivery_method') as any}
                    >
                      {OXYGEN_DELIVERY_METHODS.map(opt => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="SpO2 Notes"
                value={formData.pulse_ox_notes}
                onChange={handleChange('pulse_ox_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* Pain Assessment Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="primary" gutterBottom>
                Pain Assessment
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Pain Score"
                type="number"
                value={formData.pain_score}
                onChange={handleChange('pain_score')}
                error={!!errors.pain_score}
                helperText={errors.pain_score || '0-10 scale'}
                InputProps={{
                  inputProps: { min: 0, max: 10 }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Pain Scale Used</InputLabel>
                <Select
                  value={formData.pain_scale_used}
                  label="Pain Scale Used"
                  onChange={handleChange('pain_scale_used') as any}
                >
                  {PAIN_SCALES.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pain Location"
                value={formData.pain_location}
                onChange={handleChange('pain_location')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Pain Notes"
                value={formData.pain_notes}
                onChange={handleChange('pain_notes')}
                multiline
                rows={1}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* General Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="General Notes"
                value={formData.general_notes}
                onChange={handleChange('general_notes')}
                multiline
                rows={2}
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                {onCancel && (
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isLoading}
                  startIcon={isLoading ? <CircularProgress size={20} /> : null}
                >
                  {isLoading ? 'Saving...' : 'Save Vital Signs'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </LocalizationProvider>
  );
};

export default VitalSignsForm;
