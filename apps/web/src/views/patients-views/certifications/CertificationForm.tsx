import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Certification,
  CreateCertificationData,
  createCertification,
  updateCertification,
  formatCertificationPeriod
} from 'api/certification';

interface CertificationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string;
  certification?: Certification | null;
  mode: 'create' | 'edit';
}

const CertificationForm: React.FC<CertificationFormProps> = ({
  open,
  onClose,
  onSuccess,
  patientId,
  certification,
  mode
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCertificationData>({
    certification_period: 'INITIAL_90',
    start_date: '',
    end_date: '',
    terminal_illness_narrative: '',
    clinical_progression: '',
    decline_indicators: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === 'edit' && certification) {
      setFormData({
        certification_period: certification.certification_period,
        start_date: certification.start_date,
        end_date: certification.end_date,
        terminal_illness_narrative: certification.terminal_illness_narrative || '',
        clinical_progression: certification.clinical_progression || '',
        decline_indicators: certification.decline_indicators || ''
      });
    } else {
      // Reset form for create mode
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90);

      setFormData({
        certification_period: 'INITIAL_90',
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        terminal_illness_narrative: '',
        clinical_progression: '',
        decline_indicators: ''
      });
    }
    setError(null);
    setValidationErrors({});
  }, [mode, certification, open]);

  const handlePeriodChange = (period: 'INITIAL_90' | 'SUBSEQUENT_90' | 'SUBSEQUENT_60') => {
    const days = period === 'SUBSEQUENT_60' ? 60 : 90;
    const startDate = formData.start_date ? new Date(formData.start_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);

    setFormData({
      ...formData,
      certification_period: period,
      end_date: endDate.toISOString().split('T')[0]
    });
  };

  const handleStartDateChange = (date: Date | null) => {
    if (!date) return;

    const days = formData.certification_period === 'SUBSEQUENT_60' ? 60 : 90;
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + days);

    setFormData({
      ...formData,
      start_date: date.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    });
  };

  const handleEndDateChange = (date: Date | null) => {
    if (!date) return;
    setFormData({
      ...formData,
      end_date: date.toISOString().split('T')[0]
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) {
        errors.end_date = 'End date must be after start date';
      }
    }

    if (!formData.terminal_illness_narrative || formData.terminal_illness_narrative.trim().length < 10) {
      errors.terminal_illness_narrative = 'Terminal illness narrative is required (minimum 10 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        await createCertification(patientId, formData);
      } else if (certification) {
        await updateCertification(certification.id, {
          terminal_illness_narrative: formData.terminal_illness_narrative,
          clinical_progression: formData.clinical_progression,
          decline_indicators: formData.decline_indicators
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving certification:', err);
      setError(err.response?.data?.message || 'Failed to save certification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create New Certification' : 'Edit Certification'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth disabled={mode === 'edit'}>
                <InputLabel>Certification Period</InputLabel>
                <Select
                  value={formData.certification_period}
                  label="Certification Period"
                  onChange={(e) => handlePeriodChange(e.target.value as any)}
                >
                  <MenuItem value="INITIAL_90">
                    {formatCertificationPeriod('INITIAL_90')}
                  </MenuItem>
                  <MenuItem value="SUBSEQUENT_90">
                    {formatCertificationPeriod('SUBSEQUENT_90')}
                  </MenuItem>
                  <MenuItem value="SUBSEQUENT_60">
                    {formatCertificationPeriod('SUBSEQUENT_60')}
                  </MenuItem>
                </Select>
                <FormHelperText>
                  CMS: Initial 90 days, then 2x 90-day periods, then 60-day periods thereafter
                </FormHelperText>
              </FormControl>
            </Grid>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date ? new Date(formData.start_date) : null}
                  onChange={handleStartDateChange}
                  disabled={mode === 'edit'}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.start_date,
                      helperText: validationErrors.start_date
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={formData.end_date ? new Date(formData.end_date) : null}
                  onChange={handleEndDateChange}
                  disabled={mode === 'edit'}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!validationErrors.end_date,
                      helperText: validationErrors.end_date
                    }
                  }}
                />
              </Grid>
            </LocalizationProvider>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Terminal Illness Narrative"
                placeholder="Document the patient's terminal illness, including diagnosis and expected prognosis of 6 months or less..."
                value={formData.terminal_illness_narrative}
                onChange={(e) => setFormData({ ...formData, terminal_illness_narrative: e.target.value })}
                error={!!validationErrors.terminal_illness_narrative}
                helperText={validationErrors.terminal_illness_narrative || 'Required for CMS compliance - describe the terminal illness and prognosis'}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Clinical Progression"
                placeholder="Document the patient's clinical progression and disease trajectory..."
                value={formData.clinical_progression || ''}
                onChange={(e) => setFormData({ ...formData, clinical_progression: e.target.value })}
                helperText="Optional - describe the clinical course and progression of illness"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Decline Indicators"
                placeholder="Document specific indicators of decline (weight loss, functional decline, etc.)..."
                value={formData.decline_indicators || ''}
                onChange={(e) => setFormData({ ...formData, decline_indicators: e.target.value })}
                helperText="Optional - list specific indicators supporting terminal prognosis"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="info.main" gutterBottom>
              CMS Certification Requirements
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Physician must sign the certification within 2 days of the start of care date.
              Face-to-Face encounters are required for the 3rd benefit period and beyond,
              and must occur within 90 days before or 30 days after the start of care.
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
          {mode === 'create' ? 'Create Certification' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CertificationForm;
