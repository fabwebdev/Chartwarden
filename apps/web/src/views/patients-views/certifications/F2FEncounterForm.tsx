import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CreateF2FData, createF2F, Certification } from '../../../api/certification';

interface F2FEncounterFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
  certification?: Certification | null;
}

const F2FEncounterForm: React.FC<F2FEncounterFormProps> = ({
  open,
  onClose,
  onSuccess,
  patientId,
  certification
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateF2FData>({
    encounter_date: new Date().toISOString().split('T')[0],
    performed_by_name: '',
    performed_by_type: 'PHYSICIAN',
    visit_type: 'IN_PERSON',
    findings: '',
    terminal_prognosis_confirmed: true,
    certification_id: undefined
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setFormData({
        encounter_date: new Date().toISOString().split('T')[0],
        performed_by_name: '',
        performed_by_type: 'PHYSICIAN',
        visit_type: 'IN_PERSON',
        findings: '',
        terminal_prognosis_confirmed: true,
        certification_id: certification?.id
      });
      setError(null);
      setValidationErrors({});
    }
  }, [open, certification]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.encounter_date) {
      errors.encounter_date = 'Encounter date is required';
    }

    // Check if encounter date is in the future
    if (formData.encounter_date) {
      const encounterDate = new Date(formData.encounter_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (encounterDate > today) {
        errors.encounter_date = 'Encounter date cannot be in the future';
      }
    }

    // Validate date is within certification window if linked
    if (certification && formData.encounter_date) {
      const encounterDate = new Date(formData.encounter_date);
      const startDate = new Date(certification.start_date);

      const windowStart = new Date(startDate);
      windowStart.setDate(windowStart.getDate() - 90);

      const windowEnd = new Date(startDate);
      windowEnd.setDate(windowEnd.getDate() + 30);

      if (encounterDate < windowStart || encounterDate > windowEnd) {
        errors.encounter_date = `Encounter must be within 90 days before or 30 days after certification start (${windowStart.toLocaleDateString()} - ${windowEnd.toLocaleDateString()})`;
      }
    }

    if (!formData.performed_by_name || formData.performed_by_name.trim().length < 2) {
      errors.performed_by_name = 'Provider name is required';
    }

    if (!formData.findings || formData.findings.trim().length < 10) {
      errors.findings = 'Findings documentation is required (minimum 10 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      await createF2F(patientId, formData);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating F2F encounter:', err);
      setError(err.response?.data?.message || 'Failed to create Face-to-Face encounter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Record Face-to-Face Encounter</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {certification && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Recording F2F encounter for certification period: {certification.start_date} to {certification.end_date}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Encounter Date"
                  value={formData.encounter_date ? new Date(formData.encounter_date) : null}
                  onChange={(date) => {
                    if (date) {
                      setFormData({
                        ...formData,
                        encounter_date: date.toISOString().split('T')[0]
                      });
                    }
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.encounter_date,
                      helperText: validationErrors.encounter_date
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Visit Type</InputLabel>
                <Select
                  value={formData.visit_type}
                  label="Visit Type"
                  onChange={(e) => setFormData({ ...formData, visit_type: e.target.value as any })}
                >
                  <MenuItem value="IN_PERSON">In Person</MenuItem>
                  <MenuItem value="TELEHEALTH">Telehealth</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Provider Name"
                placeholder="Enter the name of the provider who performed the encounter"
                value={formData.performed_by_name}
                onChange={(e) => setFormData({ ...formData, performed_by_name: e.target.value })}
                error={!!validationErrors.performed_by_name}
                helperText={validationErrors.performed_by_name}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Provider Type</InputLabel>
                <Select
                  value={formData.performed_by_type}
                  label="Provider Type"
                  onChange={(e) => setFormData({ ...formData, performed_by_type: e.target.value as any })}
                >
                  <MenuItem value="PHYSICIAN">Physician (MD/DO)</MenuItem>
                  <MenuItem value="NP">Nurse Practitioner (NP)</MenuItem>
                  <MenuItem value="PA">Physician Assistant (PA)</MenuItem>
                </Select>
                <FormHelperText>
                  CMS requires F2F to be performed by a Physician, NP, or PA
                </FormHelperText>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Encounter Findings"
                placeholder="Document the clinical findings from the Face-to-Face encounter, including evidence supporting terminal prognosis..."
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                error={!!validationErrors.findings}
                helperText={validationErrors.findings || 'Required - document clinical findings supporting terminal illness'}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.terminal_prognosis_confirmed}
                    onChange={(e) => setFormData({ ...formData, terminal_prognosis_confirmed: e.target.checked })}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">
                      Terminal Prognosis Confirmed
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Provider confirms that patient has a terminal illness with prognosis of 6 months or less
                    </Typography>
                  </Box>
                }
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="warning.dark" gutterBottom>
              CMS Face-to-Face Requirements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Face-to-Face encounters are required for the 3rd benefit period and beyond.
              The encounter must occur within 90 days before or 30 days after the start of care.
              The encounter must be performed by a Physician, NP, or PA and must confirm terminal prognosis.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          Record Encounter
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default F2FEncounterForm;
