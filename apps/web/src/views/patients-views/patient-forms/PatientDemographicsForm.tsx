'use client';

import { useState, useEffect } from 'react';
import {
  Grid,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText,
  Button,
  Box,
  CircularProgress,
  Alert,
  Typography,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import MainCard from 'components/MainCard';
import { useRouter } from 'next/navigation';
import { openSnackbar } from 'api/snackbar';
import { SnackbarProps } from 'types/snackbar';
import { getPatientById, updatePatient, getAllDnrRecords, getAllEmergencyPreparednessLevels, getAllPatientPharmacies, getAllDmeProviders, getAllLiaisonPrimary, getAllLiaisonSecondary } from 'api/patient';

// Patient Demographics Types
interface PatientDemographics {
  id?: number | string;
  first_name: string;
  last_name: string;
  mi?: string;
  preferred_name?: string;
  date_of_birth?: string;
  suffix?: string;
  ssn?: string;
  gender?: string;
  hipaa_received?: boolean;
  patient_consents?: boolean;
  oxygen_dependent?: boolean;
  veterans_status?: boolean;
  dnr_id?: number | string;
  race_ethnicity_id?: number | string;
  liaison_primary_id?: number | string;
  liaison_secondary_id?: number | string;
  emergency_preparedness_level_id?: number | string;
  dme_provider_id?: number | string;
  patient_pharmacy_id?: number | string;
  primary_diagnosis_id?: number | string;
  primary_diagnosis_code?: string;
  primary_diagnosis_description?: string;
  date_of_referral?: string;
  who_took_referral?: string;
  referral_source?: string;
  referral_source_other?: string;
}

interface PatientDemographicsFormProps {
  patientId: number | string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// SSN formatting helper
const formatSSN = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  const limited = digits.slice(0, 9);
  if (limited.length <= 3) {
    return limited;
  } else if (limited.length <= 5) {
    return `${limited.slice(0, 3)}-${limited.slice(3)}`;
  } else {
    return `${limited.slice(0, 3)}-${limited.slice(3, 5)}-${limited.slice(5)}`;
  }
};

// SSN validation regex
const SSN_REGEX = /^(\d{3}-\d{2}-\d{4}|\d{9})$/;

// Validation Schema
const validationSchema = Yup.object().shape({
  first_name: Yup.string()
    .required('First name is required')
    .min(1, 'First name must be at least 1 character')
    .max(100, 'First name must be at most 100 characters'),
  last_name: Yup.string()
    .required('Last name is required')
    .min(1, 'Last name must be at least 1 character')
    .max(100, 'Last name must be at most 100 characters'),
  mi: Yup.string()
    .max(5, 'Middle initial must be at most 5 characters'),
  preferred_name: Yup.string()
    .max(100, 'Preferred name must be at most 100 characters'),
  suffix: Yup.string()
    .max(20, 'Suffix must be at most 20 characters'),
  date_of_birth: Yup.date()
    .nullable()
    .max(new Date(), 'Date of birth cannot be in the future'),
  ssn: Yup.string()
    .matches(SSN_REGEX, 'SSN must be in format XXX-XX-XXXX or 9 digits')
    .nullable(),
  gender: Yup.string()
    .oneOf(['Male', 'Female', 'Other', 'Unknown', ''], 'Invalid gender selection'),
  date_of_referral: Yup.date()
    .nullable(),
  who_took_referral: Yup.string()
    .max(200, 'Who took referral must be at most 200 characters'),
  referral_source: Yup.string()
    .max(200, 'Referral source must be at most 200 characters'),
  referral_source_other: Yup.string()
    .max(200, 'Other referral source must be at most 200 characters')
});

const GENDER_OPTIONS = [
  { value: '', label: 'Select Gender' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Unknown', label: 'Unknown' }
];

const PatientDemographicsForm = ({
  patientId,
  onSuccess,
  onCancel
}: PatientDemographicsFormProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Dropdown data
  const [dnrOptions, setDnrOptions] = useState<Array<{ id: string | number; label: string }>>([]);
  const [emergencyLevelOptions, setEmergencyLevelOptions] = useState<Array<{ id: string | number; label: string }>>([]);
  const [pharmacyOptions, setPharmacyOptions] = useState<Array<{ id: string | number; name: string }>>([]);
  const [dmeProviderOptions, setDmeProviderOptions] = useState<Array<{ id: string | number; name?: string; address?: string }>>([]);
  const [liaisonPrimaryOptions, setLiaisonPrimaryOptions] = useState<Array<{ id: string | number; first_name?: string; last_name?: string }>>([]);
  const [liaisonSecondaryOptions, setLiaisonSecondaryOptions] = useState<Array<{ id: string | number; first_name?: string; last_name?: string }>>([]);

  const formik = useFormik<PatientDemographics>({
    initialValues: {
      first_name: '',
      last_name: '',
      mi: '',
      preferred_name: '',
      date_of_birth: '',
      suffix: '',
      ssn: '',
      gender: '',
      hipaa_received: false,
      patient_consents: false,
      oxygen_dependent: false,
      veterans_status: false,
      dnr_id: '',
      liaison_primary_id: '',
      liaison_secondary_id: '',
      emergency_preparedness_level_id: '',
      dme_provider_id: '',
      patient_pharmacy_id: '',
      date_of_referral: '',
      who_took_referral: '',
      referral_source: '',
      referral_source_other: ''
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoading(true);
        setSubmitError(null);

        // Prepare payload - exclude auto-managed fields
        const excludedFields = ['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt'];
        const payload: Record<string, any> = {};

        Object.entries(values).forEach(([key, value]) => {
          if (!excludedFields.includes(key) && !key.includes('_at') && !key.includes('At')) {
            // Convert empty strings to undefined for optional fields
            if (value === '' && key !== 'first_name' && key !== 'last_name') {
              return; // Skip empty optional fields
            }
            payload[key] = value;
          }
        });

        // Ensure booleans are properly typed
        payload.hipaa_received = Boolean(values.hipaa_received);
        payload.patient_consents = Boolean(values.patient_consents);
        payload.oxygen_dependent = Boolean(values.oxygen_dependent);
        payload.veterans_status = Boolean(values.veterans_status);

        await updatePatient(patientId, payload);

        openSnackbar({
          open: true,
          message: 'Patient demographics updated successfully',
          variant: 'alert',
          alert: { color: 'success' }
        } as SnackbarProps);

        onSuccess?.();
        router.push('/patients');
      } catch (error: any) {
        const message = error?.response?.data?.message ||
                       error?.response?.data?.error ||
                       'Failed to update patient demographics';
        setSubmitError(message);

        // Handle field-level errors from API
        if (error?.response?.data?.errors) {
          const apiErrors = error.response.data.errors;
          Object.keys(apiErrors).forEach((field) => {
            formik.setFieldError(field, apiErrors[field]?.[0] || apiErrors[field]);
          });
        }

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

  const { values, errors, touched, handleSubmit, getFieldProps, setFieldValue, setValues } = formik;

  // Load patient data and dropdown options
  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        // Load patient data and dropdown options in parallel
        const [
          patientResponse,
          dnrResponse,
          emergencyResponse,
          pharmacyResponse,
          dmeResponse,
          liaisonPrimaryResponse,
          liaisonSecondaryResponse
        ] = await Promise.all([
          getPatientById(patientId),
          getAllDnrRecords().catch(() => ({ data: [] })),
          getAllEmergencyPreparednessLevels().catch(() => ({ data: [] })),
          getAllPatientPharmacies().catch(() => ({ data: [] })),
          getAllDmeProviders().catch(() => ({ data: [] })),
          getAllLiaisonPrimary().catch(() => ({ data: [] })),
          getAllLiaisonSecondary().catch(() => ({ data: [] }))
        ]);

        // Set dropdown options
        const dnrData = Array.isArray(dnrResponse) ? dnrResponse : dnrResponse?.data || [];
        setDnrOptions(dnrData.map((d: any) => ({
          id: d.id,
          label: d.dnr_status || d.name || `DNR ${d.id}`
        })));

        const emergencyData = Array.isArray(emergencyResponse) ? emergencyResponse : emergencyResponse?.data || [];
        setEmergencyLevelOptions(emergencyData.map((e: any) => ({
          id: e.id,
          label: e.level || e.description || e.name || `Level ${e.id}`
        })));

        const pharmacyData = Array.isArray(pharmacyResponse) ? pharmacyResponse : pharmacyResponse?.data || [];
        setPharmacyOptions(pharmacyData);

        const dmeData = Array.isArray(dmeResponse) ? dmeResponse : dmeResponse?.data || [];
        setDmeProviderOptions(dmeData);

        const liaisonPrimaryData = Array.isArray(liaisonPrimaryResponse) ? liaisonPrimaryResponse : liaisonPrimaryResponse?.data || [];
        setLiaisonPrimaryOptions(liaisonPrimaryData);

        const liaisonSecondaryData = Array.isArray(liaisonSecondaryResponse) ? liaisonSecondaryResponse : liaisonSecondaryResponse?.data || [];
        setLiaisonSecondaryOptions(liaisonSecondaryData);

        // Set patient form values
        const patient = patientResponse?.data || patientResponse;
        if (patient) {
          setValues({
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            mi: patient.mi || patient.middle_name || '',
            preferred_name: patient.preferred_name || '',
            date_of_birth: patient.date_of_birth || '',
            suffix: patient.suffix || '',
            ssn: patient.ssn || '',
            gender: patient.gender || patient.genders || '',
            hipaa_received: patient.hipaa_received === true || patient.hipaa_received === '1' || patient.hipaa_received === 1,
            patient_consents: patient.patient_consents === true || patient.patient_consents === '1' || patient.patient_consents === 1,
            oxygen_dependent: patient.oxygen_dependent === true || patient.oxygen_dependent === '1' || patient.oxygen_dependent === 1,
            veterans_status: patient.veterans_status === true || patient.veterans_status === '1' || patient.veterans_status === 1,
            dnr_id: patient.dnr_id || '',
            liaison_primary_id: patient.liaison_primary_id || '',
            liaison_secondary_id: patient.liaison_secondary_id || '',
            emergency_preparedness_level_id: patient.emergency_preparedness_level_id || '',
            dme_provider_id: patient.dme_provider_id || patient.dme_provider || '',
            patient_pharmacy_id: patient.patient_pharmacy_id || '',
            date_of_referral: patient.date_of_referral || '',
            who_took_referral: patient.who_took_referral || '',
            referral_source: patient.referral_source || '',
            referral_source_other: patient.referral_source_other || ''
          });
        }
      } catch (error: any) {
        console.error('Error loading patient data:', error);
        setSubmitError('Failed to load patient data');
        openSnackbar({
          open: true,
          message: 'Failed to load patient data',
          variant: 'alert',
          alert: { color: 'error' }
        } as SnackbarProps);
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [patientId, setValues]);

  // Handle SSN formatting
  const handleSSNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSSN(e.target.value);
    setFieldValue('ssn', formatted);
  };

  // Handle cancel
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/patients');
    }
  };

  if (initialLoading) {
    return (
      <MainCard title="Edit Patient Demographics">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MainCard title="Edit Patient Demographics">
        <form onSubmit={handleSubmit} noValidate>
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError(null)}>
              {submitError}
            </Alert>
          )}

          {/* Basic Information Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Basic Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            {/* First Name */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="first_name"
                  label="First Name"
                  required
                  {...getFieldProps('first_name')}
                  error={Boolean(touched.first_name && errors.first_name)}
                  helperText={touched.first_name && errors.first_name}
                />
              </Stack>
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="last_name"
                  label="Last Name"
                  required
                  {...getFieldProps('last_name')}
                  error={Boolean(touched.last_name && errors.last_name)}
                  helperText={touched.last_name && errors.last_name}
                />
              </Stack>
            </Grid>

            {/* Middle Initial */}
            <Grid item xs={12} sm={6} md={1}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="mi"
                  label="MI"
                  {...getFieldProps('mi')}
                  error={Boolean(touched.mi && errors.mi)}
                  helperText={touched.mi && errors.mi}
                  inputProps={{ maxLength: 5 }}
                />
              </Stack>
            </Grid>

            {/* Suffix */}
            <Grid item xs={12} sm={6} md={3}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="suffix"
                  label="Suffix"
                  {...getFieldProps('suffix')}
                  error={Boolean(touched.suffix && errors.suffix)}
                  helperText={touched.suffix && errors.suffix}
                />
              </Stack>
            </Grid>

            {/* Preferred Name */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="preferred_name"
                  label="Preferred Name"
                  {...getFieldProps('preferred_name')}
                  error={Boolean(touched.preferred_name && errors.preferred_name)}
                  helperText={touched.preferred_name && errors.preferred_name}
                />
              </Stack>
            </Grid>

            {/* Date of Birth */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <DatePicker
                  label="Date of Birth"
                  value={values.date_of_birth ? new Date(values.date_of_birth) : null}
                  onChange={(date) => {
                    setFieldValue('date_of_birth', date ? date.toISOString().split('T')[0] : '');
                  }}
                  maxDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: Boolean(touched.date_of_birth && errors.date_of_birth),
                      helperText: touched.date_of_birth && errors.date_of_birth as string
                    }
                  }}
                />
              </Stack>
            </Grid>

            {/* SSN */}
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  id="ssn"
                  label="SSN"
                  placeholder="XXX-XX-XXXX"
                  value={values.ssn}
                  onChange={handleSSNChange}
                  error={Boolean(touched.ssn && errors.ssn)}
                  helperText={touched.ssn && errors.ssn}
                  inputProps={{ maxLength: 11 }}
                />
              </Stack>
            </Grid>

            {/* Gender */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth error={Boolean(touched.gender && errors.gender)}>
                <InputLabel id="gender-label">Gender</InputLabel>
                <Select
                  labelId="gender-label"
                  id="gender"
                  label="Gender"
                  {...getFieldProps('gender')}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {touched.gender && errors.gender && (
                  <FormHelperText>{errors.gender}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>

          {/* Consent & Status Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Consent & Status
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            {/* HIPAA Received */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.hipaa_received)}
                    onChange={(e) => setFieldValue('hipaa_received', e.target.checked)}
                    name="hipaa_received"
                  />
                }
                label="HIPAA Received"
              />
            </Grid>

            {/* Patient Consents */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.patient_consents)}
                    onChange={(e) => setFieldValue('patient_consents', e.target.checked)}
                    name="patient_consents"
                  />
                }
                label="Patient Consents"
              />
            </Grid>

            {/* Oxygen Dependent */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.oxygen_dependent)}
                    onChange={(e) => setFieldValue('oxygen_dependent', e.target.checked)}
                    name="oxygen_dependent"
                  />
                }
                label="Oxygen Dependent"
              />
            </Grid>

            {/* Veterans Status */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(values.veterans_status)}
                    onChange={(e) => setFieldValue('veterans_status', e.target.checked)}
                    name="veterans_status"
                  />
                }
                label="Veteran"
              />
            </Grid>

            {/* DNR */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="dnr-label">DNR Status</InputLabel>
                <Select
                  labelId="dnr-label"
                  id="dnr_id"
                  label="DNR Status"
                  {...getFieldProps('dnr_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {dnrOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Emergency Preparedness Level */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="emergency-level-label">Emergency Preparedness Level</InputLabel>
                <Select
                  labelId="emergency-level-label"
                  id="emergency_preparedness_level_id"
                  label="Emergency Preparedness Level"
                  {...getFieldProps('emergency_preparedness_level_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {emergencyLevelOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Care Team Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Care Team & Providers
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            {/* Primary Liaison */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="liaison-primary-label">Primary Liaison</InputLabel>
                <Select
                  labelId="liaison-primary-label"
                  id="liaison_primary_id"
                  label="Primary Liaison"
                  {...getFieldProps('liaison_primary_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {liaisonPrimaryOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {[option.first_name, option.last_name].filter(Boolean).join(' ') || `Liaison ${option.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Secondary Liaison */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="liaison-secondary-label">Secondary Liaison</InputLabel>
                <Select
                  labelId="liaison-secondary-label"
                  id="liaison_secondary_id"
                  label="Secondary Liaison"
                  {...getFieldProps('liaison_secondary_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {liaisonSecondaryOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {[option.first_name, option.last_name].filter(Boolean).join(' ') || `Liaison ${option.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* DME Provider */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="dme-provider-label">DME Provider</InputLabel>
                <Select
                  labelId="dme-provider-label"
                  id="dme_provider_id"
                  label="DME Provider"
                  {...getFieldProps('dme_provider_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {dmeProviderOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name || option.address || `Provider ${option.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Patient Pharmacy */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel id="pharmacy-label">Pharmacy</InputLabel>
                <Select
                  labelId="pharmacy-label"
                  id="patient_pharmacy_id"
                  label="Pharmacy"
                  {...getFieldProps('patient_pharmacy_id')}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {pharmacyOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name || `Pharmacy ${option.id}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Referral Information Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Referral Information
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Grid container spacing={3}>
            {/* Date of Referral */}
            <Grid item xs={12} sm={6} md={4}>
              <DatePicker
                label="Date of Referral"
                value={values.date_of_referral ? new Date(values.date_of_referral) : null}
                onChange={(date) => {
                  setFieldValue('date_of_referral', date ? date.toISOString().split('T')[0] : '');
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: Boolean(touched.date_of_referral && errors.date_of_referral),
                    helperText: touched.date_of_referral && errors.date_of_referral as string
                  }
                }}
              />
            </Grid>

            {/* Who Took Referral */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                id="who_took_referral"
                label="Who Took Referral"
                {...getFieldProps('who_took_referral')}
                error={Boolean(touched.who_took_referral && errors.who_took_referral)}
                helperText={touched.who_took_referral && errors.who_took_referral}
              />
            </Grid>

            {/* Referral Source */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                id="referral_source"
                label="Referral Source"
                {...getFieldProps('referral_source')}
                error={Boolean(touched.referral_source && errors.referral_source)}
                helperText={touched.referral_source && errors.referral_source}
              />
            </Grid>

            {/* Referral Source Other */}
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                id="referral_source_other"
                label="Other Referral Source"
                {...getFieldProps('referral_source_other')}
                error={Boolean(touched.referral_source_other && errors.referral_source_other)}
                helperText={touched.referral_source_other && errors.referral_source_other}
              />
            </Grid>
          </Grid>

          {/* Form Actions */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || formik.isSubmitting}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </MainCard>
    </LocalizationProvider>
  );
};

export default PatientDemographicsForm;
