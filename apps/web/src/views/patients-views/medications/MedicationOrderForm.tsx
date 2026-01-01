import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Typography,
  Divider,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { openSnackbar } from 'api/snackbar';
import { SnackbarProps } from 'types/snackbar';

import {
  Medication,
  CreateMedicationRequest,
  DrugInteraction,
  PatientAllergy,
  createMedication,
  updateMedication,
  checkInteractions,
  MEDICATION_ROUTES,
  MEDICATION_FREQUENCIES,
  CONTROLLED_SCHEDULES,
  MedicationRoute,
  MedicationFrequency,
  ControlledSchedule
} from 'api/medication';

interface MedicationOrderFormProps {
  open: boolean;
  onClose: () => void;
  patientId: string | number;
  medication?: Medication | null;
  onSuccess?: () => void;
}

const validationSchema = Yup.object().shape({
  medication_name: Yup.string().required('Medication name is required').max(255),
  generic_name: Yup.string().max(255),
  ndc_code: Yup.string().max(20),
  medication_route: Yup.string().required('Route is required'),
  dosage: Yup.string().required('Dosage is required').max(100),
  frequency: Yup.string().required('Frequency is required'),
  instructions: Yup.string().max(1000),
  start_date: Yup.date().required('Start date is required'),
  end_date: Yup.date().nullable().min(Yup.ref('start_date'), 'End date must be after start date')
});

const MedicationOrderForm = ({
  open,
  onClose,
  patientId,
  medication,
  onSuccess
}: MedicationOrderFormProps) => {
  const [loading, setLoading] = useState(false);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([]);
  const [allergyConflicts, setAllergyConflicts] = useState<PatientAllergy[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  const isEditing = !!medication;

  const formik = useFormik({
    initialValues: {
      medication_name: medication?.medication_name || '',
      generic_name: medication?.generic_name || '',
      ndc_code: medication?.ndc_code || '',
      medication_route: medication?.medication_route || '' as MedicationRoute,
      dosage: medication?.dosage || '',
      frequency: medication?.frequency || '' as MedicationFrequency,
      instructions: medication?.instructions || '',
      start_date: medication?.start_date ? new Date(medication.start_date) : new Date(),
      end_date: medication?.end_date ? new Date(medication.end_date) : null,
      controlled_schedule: medication?.controlled_schedule || '' as ControlledSchedule | '',
      is_hospice_related: medication?.is_hospice_related ?? true,
      prescriber_id: medication?.prescriber_id || '',
      override_warnings: false
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoading(true);

        const payload: CreateMedicationRequest = {
          medication_name: values.medication_name,
          generic_name: values.generic_name || undefined,
          ndc_code: values.ndc_code || undefined,
          medication_route: values.medication_route as MedicationRoute,
          dosage: values.dosage,
          frequency: values.frequency as MedicationFrequency,
          instructions: values.instructions || undefined,
          start_date: values.start_date.toISOString().split('T')[0],
          end_date: values.end_date ? values.end_date.toISOString().split('T')[0] : undefined,
          controlled_schedule: values.controlled_schedule as ControlledSchedule || undefined,
          is_hospice_related: values.is_hospice_related,
          prescriber_id: values.prescriber_id || undefined,
          override_warnings: values.override_warnings
        };

        let response;
        if (isEditing && medication) {
          response = await updateMedication(patientId, medication.id, payload);
        } else {
          response = await createMedication(patientId, payload);
        }

        if (response.status === 201 || response.status === 200) {
          openSnackbar({
            open: true,
            message: isEditing ? 'Medication updated successfully' : 'Medication order created successfully',
            variant: 'alert',
            alert: { color: 'success' }
          } as SnackbarProps);

          if (response.warnings && !response.warnings.overridden) {
            setDrugInteractions(response.warnings.drug_interactions || []);
            setAllergyConflicts(response.warnings.allergy_conflicts || []);
          }

          onSuccess?.();
          handleClose();
        } else if (response.status === 409) {
          // Interaction/allergy warnings - show and allow override
          setDrugInteractions(response.warnings?.drug_interactions || []);
          setAllergyConflicts(response.warnings?.allergy_conflicts || []);
          setShowWarnings(true);
        }
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Failed to save medication';
        openSnackbar({
          open: true,
          message,
          variant: 'alert',
          alert: { color: 'error' }
        } as SnackbarProps);
      } finally {
        setLoading(false);
        setSubmitting(false);
      }
    }
  });

  const { values, errors, touched, handleSubmit, getFieldProps, setFieldValue, resetForm } = formik;

  // Check interactions when medication name changes
  const handleCheckInteractions = async () => {
    if (!values.medication_name || values.medication_name.length < 3) return;

    setCheckingInteractions(true);
    try {
      const response = await checkInteractions(patientId, values.medication_name);
      if (response.status === 200 && response.data) {
        setDrugInteractions(response.data.drug_interactions || []);
        setAllergyConflicts(response.data.allergy_conflicts || []);
        if (response.data.has_warnings) {
          setShowWarnings(true);
        }
      }
    } catch (error) {
      console.error('Error checking interactions:', error);
    } finally {
      setCheckingInteractions(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setDrugInteractions([]);
    setAllergyConflicts([]);
    setShowWarnings(false);
    onClose();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CONTRAINDICATED':
        return 'error';
      case 'SEVERE':
        return 'error';
      case 'MODERATE':
        return 'warning';
      case 'MINOR':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {isEditing ? 'Edit Medication Order' : 'New Medication Order'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ py: 3 }}>
            <Grid container spacing={3}>
              {/* Warnings Section */}
              {showWarnings && (drugInteractions.length > 0 || allergyConflicts.length > 0) && (
                <Grid item xs={12}>
                  {drugInteractions.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Drug Interactions Detected:</Typography>
                      <Stack spacing={1}>
                        {drugInteractions.map((interaction, index) => (
                          <Box key={index}>
                            <Chip
                              size="small"
                              label={interaction.interaction_severity}
                              color={getSeverityColor(interaction.interaction_severity) as any}
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" component="span">
                              {interaction.drug1_name} + {interaction.drug2_name}: {interaction.interaction_description}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                  {allergyConflicts.length > 0 && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Allergy Conflicts:</Typography>
                      <Stack spacing={1}>
                        {allergyConflicts.map((allergy, index) => (
                          <Box key={index}>
                            <Chip
                              size="small"
                              label={allergy.reaction_severity || 'Unknown severity'}
                              color="error"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="body2" component="span">
                              Patient is allergic to {allergy.allergen_name}
                              {allergy.reaction_description && `: ${allergy.reaction_description}`}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.override_warnings}
                        onChange={(e) => setFieldValue('override_warnings', e.target.checked)}
                        color="warning"
                      />
                    }
                    label="I acknowledge the warnings and wish to proceed"
                  />
                </Grid>
              )}

              {/* Medication Name */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="medication_name">Medication Name *</InputLabel>
                  <TextField
                    fullWidth
                    id="medication_name"
                    placeholder="Enter medication name"
                    {...getFieldProps('medication_name')}
                    error={Boolean(touched.medication_name && errors.medication_name)}
                    helperText={touched.medication_name && errors.medication_name}
                    onBlur={(e) => {
                      getFieldProps('medication_name').onBlur(e);
                      handleCheckInteractions();
                    }}
                    InputProps={{
                      endAdornment: checkingInteractions ? <CircularProgress size={20} /> : null
                    }}
                  />
                </Stack>
              </Grid>

              {/* Generic Name */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="generic_name">Generic Name</InputLabel>
                  <TextField
                    fullWidth
                    id="generic_name"
                    placeholder="Enter generic name"
                    {...getFieldProps('generic_name')}
                    error={Boolean(touched.generic_name && errors.generic_name)}
                    helperText={touched.generic_name && errors.generic_name}
                  />
                </Stack>
              </Grid>

              {/* Dosage */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="dosage">Dosage *</InputLabel>
                  <TextField
                    fullWidth
                    id="dosage"
                    placeholder="e.g., 500mg, 10mL"
                    {...getFieldProps('dosage')}
                    error={Boolean(touched.dosage && errors.dosage)}
                    helperText={touched.dosage && errors.dosage}
                  />
                </Stack>
              </Grid>

              {/* Route */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="medication_route">Route *</InputLabel>
                  <FormControl fullWidth error={Boolean(touched.medication_route && errors.medication_route)}>
                    <Select
                      id="medication_route"
                      displayEmpty
                      {...getFieldProps('medication_route')}
                    >
                      <MenuItem value="" disabled>
                        <Typography color="textSecondary">Select route</Typography>
                      </MenuItem>
                      {MEDICATION_ROUTES.map((route) => (
                        <MenuItem key={route.value} value={route.value}>
                          {route.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              {/* Frequency */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="frequency">Frequency *</InputLabel>
                  <FormControl fullWidth error={Boolean(touched.frequency && errors.frequency)}>
                    <Select
                      id="frequency"
                      displayEmpty
                      {...getFieldProps('frequency')}
                    >
                      <MenuItem value="" disabled>
                        <Typography color="textSecondary">Select frequency</Typography>
                      </MenuItem>
                      {MEDICATION_FREQUENCIES.map((freq) => (
                        <MenuItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              {/* Controlled Schedule */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="controlled_schedule">Controlled Substance Schedule</InputLabel>
                  <FormControl fullWidth>
                    <Select
                      id="controlled_schedule"
                      displayEmpty
                      {...getFieldProps('controlled_schedule')}
                    >
                      <MenuItem value="">
                        <Typography color="textSecondary">Not a controlled substance</Typography>
                      </MenuItem>
                      {CONTROLLED_SCHEDULES.map((schedule) => (
                        <MenuItem key={schedule.value} value={schedule.value}>
                          {schedule.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              {/* NDC Code */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="ndc_code">NDC Code</InputLabel>
                  <TextField
                    fullWidth
                    id="ndc_code"
                    placeholder="Enter NDC code"
                    {...getFieldProps('ndc_code')}
                    error={Boolean(touched.ndc_code && errors.ndc_code)}
                    helperText={touched.ndc_code && errors.ndc_code}
                  />
                </Stack>
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel>Start Date *</InputLabel>
                  <DatePicker
                    value={values.start_date}
                    onChange={(date) => setFieldValue('start_date', date)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(touched.start_date && errors.start_date),
                        helperText: touched.start_date && errors.start_date ? String(errors.start_date) : ''
                      }
                    }}
                  />
                </Stack>
              </Grid>

              {/* End Date */}
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <InputLabel>End Date</InputLabel>
                  <DatePicker
                    value={values.end_date}
                    onChange={(date) => setFieldValue('end_date', date)}
                    minDate={values.start_date}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: Boolean(touched.end_date && errors.end_date),
                        helperText: touched.end_date && errors.end_date ? String(errors.end_date) : ''
                      }
                    }}
                  />
                </Stack>
              </Grid>

              {/* Instructions */}
              <Grid item xs={12}>
                <Stack spacing={1}>
                  <InputLabel htmlFor="instructions">Special Instructions</InputLabel>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    id="instructions"
                    placeholder="Enter any special instructions or notes"
                    {...getFieldProps('instructions')}
                    error={Boolean(touched.instructions && errors.instructions)}
                    helperText={touched.instructions && errors.instructions}
                  />
                </Stack>
              </Grid>

              {/* Hospice Related Toggle */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.is_hospice_related}
                      onChange={(e) => setFieldValue('is_hospice_related', e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Hospice-related medication"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ p: 2.5 }}>
            <Button color="error" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {isEditing ? 'Update Order' : 'Create Order'}
            </Button>
          </DialogActions>
        </form>
      </LocalizationProvider>
    </Dialog>
  );
};

export default MedicationOrderForm;
