import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  BereavementCase,
  CreateBereavementCaseData,
  createBereavementCase,
  updateBereavementCase
} from 'api/bereavement';

interface BereavementCaseFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  patientId: string | number;
  bereavementCase?: BereavementCase | null;
  mode: 'create' | 'edit';
}

const BereavementCaseForm: React.FC<BereavementCaseFormProps> = ({
  open,
  onClose,
  onSuccess,
  patientId,
  bereavementCase,
  mode
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    date_of_death: Date | null;
    service_level: string;
    initial_assessment_notes: string;
    special_considerations: string;
    cultural_preferences: string;
    case_status: string;
    closure_reason: string;
    closure_notes: string;
  }>({
    date_of_death: null,
    service_level: 'STANDARD',
    initial_assessment_notes: '',
    special_considerations: '',
    cultural_preferences: '',
    case_status: 'ACTIVE',
    closure_reason: '',
    closure_notes: ''
  });

  useEffect(() => {
    if (bereavementCase && mode === 'edit') {
      setFormData({
        date_of_death: bereavementCase.date_of_death ? new Date(bereavementCase.date_of_death) : null,
        service_level: bereavementCase.service_level || 'STANDARD',
        initial_assessment_notes: bereavementCase.initial_assessment_notes || '',
        special_considerations: bereavementCase.special_considerations || '',
        cultural_preferences: bereavementCase.cultural_preferences || '',
        case_status: bereavementCase.case_status || 'ACTIVE',
        closure_reason: bereavementCase.closure_reason || '',
        closure_notes: bereavementCase.closure_notes || ''
      });
    } else {
      setFormData({
        date_of_death: null,
        service_level: 'STANDARD',
        initial_assessment_notes: '',
        special_considerations: '',
        cultural_preferences: '',
        case_status: 'ACTIVE',
        closure_reason: '',
        closure_notes: ''
      });
    }
    setError(null);
  }, [bereavementCase, mode, open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.date_of_death) {
      setError('Date of death is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (mode === 'create') {
        const createData: CreateBereavementCaseData = {
          patient_id: Number(patientId),
          date_of_death: formData.date_of_death.toISOString().split('T')[0],
          service_level: formData.service_level as 'STANDARD' | 'ENHANCED' | 'HIGH_RISK',
          initial_assessment_notes: formData.initial_assessment_notes || undefined,
          special_considerations: formData.special_considerations || undefined,
          cultural_preferences: formData.cultural_preferences || undefined
        };
        await createBereavementCase(createData);
      } else if (bereavementCase) {
        const updateData: Partial<BereavementCase> = {
          date_of_death: formData.date_of_death.toISOString().split('T')[0],
          service_level: formData.service_level as 'STANDARD' | 'ENHANCED' | 'HIGH_RISK',
          initial_assessment_notes: formData.initial_assessment_notes || undefined,
          special_considerations: formData.special_considerations || undefined,
          cultural_preferences: formData.cultural_preferences || undefined,
          case_status: formData.case_status as 'ACTIVE' | 'COMPLETED' | 'CLOSED_EARLY'
        };

        if (formData.case_status !== 'ACTIVE') {
          updateData.closure_reason = formData.closure_reason;
          updateData.closure_notes = formData.closure_notes;
          updateData.closure_date = new Date().toISOString().split('T')[0];
        }

        await updateBereavementCase(bereavementCase.id, updateData);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving bereavement case:', err);
      setError(err.response?.data?.message || 'Failed to save bereavement case');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Create Bereavement Case' : 'Edit Bereavement Case'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Date of Death *"
                value={formData.date_of_death}
                onChange={(date) => handleChange('date_of_death', date)}
                maxDate={new Date()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !formData.date_of_death && error !== null,
                    helperText: 'Required. Bereavement period is 13 months from this date.'
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Service Level</InputLabel>
              <Select
                value={formData.service_level}
                label="Service Level"
                onChange={(e) => handleChange('service_level', e.target.value)}
              >
                <MenuItem value="STANDARD">Standard</MenuItem>
                <MenuItem value="ENHANCED">Enhanced</MenuItem>
                <MenuItem value="HIGH_RISK">High Risk</MenuItem>
              </Select>
              <FormHelperText>
                High Risk: Multiple risk factors present. Enhanced: Some concerns identified.
              </FormHelperText>
            </FormControl>
          </Grid>

          {mode === 'edit' && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Case Status</InputLabel>
                <Select
                  value={formData.case_status}
                  label="Case Status"
                  onChange={(e) => handleChange('case_status', e.target.value)}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="COMPLETED">Completed (13 months)</MenuItem>
                  <MenuItem value="CLOSED_EARLY">Closed Early</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}

          {mode === 'edit' && formData.case_status !== 'ACTIVE' && (
            <>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Closure Reason</InputLabel>
                  <Select
                    value={formData.closure_reason}
                    label="Closure Reason"
                    onChange={(e) => handleChange('closure_reason', e.target.value)}
                  >
                    <MenuItem value="COMPLETED_13_MONTHS">Completed 13 Months</MenuItem>
                    <MenuItem value="DECLINED_SERVICES">Declined Services</MenuItem>
                    <MenuItem value="MOVED_AWAY">Moved Away</MenuItem>
                    <MenuItem value="LOST_CONTACT">Lost Contact</MenuItem>
                    <MenuItem value="OTHER">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Closure Notes"
                  value={formData.closure_notes}
                  onChange={(e) => handleChange('closure_notes', e.target.value)}
                  placeholder="Document reason for case closure..."
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Initial Assessment Notes"
              value={formData.initial_assessment_notes}
              onChange={(e) => handleChange('initial_assessment_notes', e.target.value)}
              placeholder="Document initial assessment of family's grief support needs..."
              helperText="Include observations about family dynamics, immediate concerns, and recommended services."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Cultural Preferences"
              value={formData.cultural_preferences}
              onChange={(e) => handleChange('cultural_preferences', e.target.value)}
              placeholder="Religious, cultural, or ethnic considerations..."
              helperText="Document any cultural or religious practices that should guide bereavement services."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Special Considerations"
              value={formData.special_considerations}
              onChange={(e) => handleChange('special_considerations', e.target.value)}
              placeholder="Language needs, accessibility requirements..."
              helperText="Note any special accommodations needed for family contacts."
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
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {mode === 'create' ? 'Create Case' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BereavementCaseForm;
