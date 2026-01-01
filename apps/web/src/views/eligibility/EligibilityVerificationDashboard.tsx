'use client';

import { useState, useEffect, useCallback } from 'react';

// Material-UI
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import FormHelperText from '@mui/material/FormHelperText';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Autocomplete from '@mui/material/Autocomplete';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Skeleton from '@mui/material/Skeleton';
import Collapse from '@mui/material/Collapse';

// Icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// Project Imports
import MainCard from 'components/MainCard';
import {
  verifyEligibility,
  getCoverageSummary,
  listRequests,
  getPayers,
  searchPatients,
  retryVerification,
  formatCurrency,
  formatDate,
  getStatusColor,
  getCoverageStatusColor,
  getServiceTypeLabel,
  getBenefitTypeLabel,
  type Payer,
  type Patient,
  type VerificationRequest,
  type VerificationResponse,
  type CoverageSummary,
  type BenefitDetail,
  type EligibilityRequest
} from 'api/eligibility';

// ==============================|| TOOLTIP DEFINITIONS ||============================== //

const INSURANCE_TOOLTIPS: Record<string, string> = {
  deductible: 'The amount you must pay out-of-pocket before insurance begins to cover services.',
  coinsurance: 'Your share of the costs of a covered healthcare service, calculated as a percentage.',
  copay: 'A fixed amount you pay for a covered healthcare service after you pay your deductible.',
  outOfPocketMax: 'The most you have to pay for covered services in a plan year. After reaching this amount, insurance pays 100%.',
  memberId: 'The unique identifier assigned to you by your insurance company.',
  subscriberId: 'The ID of the primary insurance policy holder (may differ from member ID for dependents).',
  effectiveDate: 'The date when your insurance coverage begins.',
  terminationDate: 'The date when your insurance coverage ends.',
  authorization: 'Prior approval from the insurance company required before certain services are covered.',
  inNetwork: 'Healthcare providers who have contracted with your insurance company, typically offering lower costs.',
  outOfNetwork: 'Healthcare providers not contracted with your insurance, often resulting in higher costs.'
};

const InfoTooltip = ({ term }: { term: string }) => (
  <Tooltip title={INSURANCE_TOOLTIPS[term] || ''} arrow placement="top">
    <HelpOutlineIcon sx={{ fontSize: 16, ml: 0.5, color: 'text.secondary', cursor: 'help' }} />
  </Tooltip>
);

// ==============================|| SERVICE TYPE OPTIONS ||============================== //

const SERVICE_TYPES = [
  { value: 'HOSPICE', label: 'Hospice Care' },
  { value: 'MEDICAL', label: 'Medical Services' },
  { value: 'HEALTH_BENEFIT_PLAN', label: 'Health Benefit Plan' },
  { value: 'SKILLED_NURSING', label: 'Skilled Nursing' },
  { value: 'HOME_HEALTH', label: 'Home Health' }
];

// ==============================|| VERIFICATION FORM ||============================== //

interface VerificationFormData {
  patientId: number | null;
  payerId: number | null;
  serviceType: string;
  memberFirstName: string;
  memberLastName: string;
  memberDateOfBirth: string;
  memberId: string;
  subscriberId: string;
  serviceDate: string;
  providerNpi: string;
  isSubscriber: boolean;
  subscriberFirstName: string;
  subscriberLastName: string;
  subscriberDateOfBirth: string;
}

interface FormErrors {
  patientId?: string;
  payerId?: string;
  memberFirstName?: string;
  memberLastName?: string;
  memberDateOfBirth?: string;
  memberId?: string;
  subscriberFirstName?: string;
  subscriberLastName?: string;
  subscriberDateOfBirth?: string;
}

const initialFormData: VerificationFormData = {
  patientId: null,
  payerId: null,
  serviceType: 'HOSPICE',
  memberFirstName: '',
  memberLastName: '',
  memberDateOfBirth: '',
  memberId: '',
  subscriberId: '',
  serviceDate: '',
  providerNpi: '',
  isSubscriber: true,
  subscriberFirstName: '',
  subscriberLastName: '',
  subscriberDateOfBirth: ''
};

interface VerificationFormProps {
  onVerificationComplete: (response: VerificationResponse, coverageSummary: CoverageSummary | null) => void;
  recentSearches: Array<{ patientId: number; patientName: string; memberId: string }>;
  onQuickSearch: (search: { patientId: number; patientName: string; memberId: string }) => void;
}

const VerificationForm = ({ onVerificationComplete, recentSearches, onQuickSearch }: VerificationFormProps) => {
  const [formData, setFormData] = useState<VerificationFormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payers, setPayers] = useState<Payer[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load payers on mount
  useEffect(() => {
    const loadPayers = async () => {
      setLoadingPayers(true);
      try {
        const payerList = await getPayers();
        setPayers(payerList);
      } catch (error) {
        console.error('Failed to load payers:', error);
      } finally {
        setLoadingPayers(false);
      }
    };
    loadPayers();
  }, []);

  // Search patients
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoadingPatients(true);
      try {
        const results = await searchPatients(patientSearch);
        setPatients(results);
      } catch (error) {
        console.error('Failed to search patients:', error);
      } finally {
        setLoadingPatients(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [patientSearch]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.patientId && !formData.memberFirstName) {
      newErrors.patientId = 'Select a patient or enter member information';
    }

    if (!formData.patientId) {
      if (!formData.memberFirstName?.trim()) {
        newErrors.memberFirstName = 'First name is required';
      }
      if (!formData.memberLastName?.trim()) {
        newErrors.memberLastName = 'Last name is required';
      }
      if (!formData.memberDateOfBirth) {
        newErrors.memberDateOfBirth = 'Date of birth is required';
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.memberDateOfBirth)) {
        newErrors.memberDateOfBirth = 'Use MM/DD/YYYY format';
      }
      if (!formData.memberId?.trim()) {
        newErrors.memberId = 'Member ID is required';
      }
    }

    if (!formData.payerId) {
      newErrors.payerId = 'Insurance provider is required';
    }

    if (!formData.isSubscriber) {
      if (!formData.subscriberFirstName?.trim()) {
        newErrors.subscriberFirstName = 'Subscriber first name is required';
      }
      if (!formData.subscriberLastName?.trim()) {
        newErrors.subscriberLastName = 'Subscriber last name is required';
      }
      if (!formData.subscriberDateOfBirth) {
        newErrors.subscriberDateOfBirth = 'Subscriber date of birth is required';
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(formData.subscriberDateOfBirth)) {
        newErrors.subscriberDateOfBirth = 'Use MM/DD/YYYY format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient | null) => {
    setSelectedPatient(patient);
    if (patient) {
      const dob = patient.date_of_birth
        ? new Date(patient.date_of_birth).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })
        : '';
      setFormData({
        ...formData,
        patientId: patient.id,
        memberFirstName: patient.first_name,
        memberLastName: patient.last_name,
        memberDateOfBirth: dob,
        memberId: patient.member_id || ''
      });
    } else {
      setFormData({
        ...formData,
        patientId: null,
        memberFirstName: '',
        memberLastName: '',
        memberDateOfBirth: '',
        memberId: ''
      });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const request: VerificationRequest = {
        patientId: formData.patientId || 0,
        payerId: formData.payerId || undefined,
        serviceType: formData.serviceType as VerificationRequest['serviceType'],
        memberFirstName: formData.memberFirstName,
        memberLastName: formData.memberLastName,
        memberDateOfBirth: formData.memberDateOfBirth,
        memberId: formData.memberId,
        subscriberId: formData.subscriberId || formData.memberId,
        serviceDate: formData.serviceDate || undefined,
        providerNpi: formData.providerNpi || undefined,
        isSubscriber: formData.isSubscriber,
        subscriberFirstName: formData.isSubscriber ? undefined : formData.subscriberFirstName,
        subscriberLastName: formData.isSubscriber ? undefined : formData.subscriberLastName,
        subscriberDateOfBirth: formData.isSubscriber ? undefined : formData.subscriberDateOfBirth
      };

      const response = await verifyEligibility(request);

      // Get coverage summary if we have a patient ID
      let coverageSummary: CoverageSummary | null = null;
      if (formData.patientId) {
        coverageSummary = await getCoverageSummary(formData.patientId);
      }

      onVerificationComplete(response, coverageSummary);
    } catch (error: any) {
      setSubmitError(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date input
  const formatDateInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 8 digits
    const limited = digits.slice(0, 8);
    // Format as MM/DD/YYYY
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const handleDateChange = (field: keyof VerificationFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setFormData({ ...formData, [field]: formatted });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Eligibility Verification
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enter patient information to verify insurance coverage and benefits.
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
            {submitError}
          </Alert>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Recent Searches
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {recentSearches.slice(0, 5).map((search, index) => (
                <Chip
                  key={index}
                  label={`${search.patientName} (${search.memberId})`}
                  size="small"
                  variant="outlined"
                  onClick={() => onQuickSearch(search)}
                  icon={<HistoryIcon />}
                  sx={{ mb: 1 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Patient Selection */}
            <Grid item xs={12}>
              <Autocomplete
                options={patients}
                getOptionLabel={(option) =>
                  `${option.first_name} ${option.last_name} (DOB: ${formatDate(option.date_of_birth)})`
                }
                value={selectedPatient}
                onChange={(_, value) => handlePatientSelect(value)}
                onInputChange={(_, value) => setPatientSearch(value)}
                loading={loadingPatients}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search Patient (Optional)"
                    placeholder="Type to search by name..."
                    error={!!errors.patientId}
                    helperText={errors.patientId}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                      endAdornment: (
                        <>
                          {loadingPatients ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      )
                    }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption" color="text.secondary">
                  OR Enter Member Information
                </Typography>
              </Divider>
            </Grid>

            {/* Member Information */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Member First Name"
                value={formData.memberFirstName}
                onChange={(e) => setFormData({ ...formData, memberFirstName: e.target.value })}
                error={!!errors.memberFirstName}
                helperText={errors.memberFirstName}
                disabled={!!selectedPatient}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Member Last Name"
                value={formData.memberLastName}
                onChange={(e) => setFormData({ ...formData, memberLastName: e.target.value })}
                error={!!errors.memberLastName}
                helperText={errors.memberLastName}
                disabled={!!selectedPatient}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                value={formData.memberDateOfBirth}
                onChange={handleDateChange('memberDateOfBirth')}
                placeholder="MM/DD/YYYY"
                error={!!errors.memberDateOfBirth}
                helperText={errors.memberDateOfBirth || 'Format: MM/DD/YYYY'}
                disabled={!!selectedPatient}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Member/Subscriber ID"
                value={formData.memberId}
                onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                error={!!errors.memberId}
                helperText={errors.memberId}
                InputProps={{
                  endAdornment: <InfoTooltip term="memberId" />
                }}
              />
            </Grid>

            {/* Insurance Provider */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.payerId}>
                <InputLabel>Insurance Provider *</InputLabel>
                <Select
                  value={formData.payerId || ''}
                  onChange={(e) => setFormData({ ...formData, payerId: e.target.value as number })}
                  label="Insurance Provider *"
                  disabled={loadingPayers}
                >
                  {payers.map((payer) => (
                    <MenuItem key={payer.id} value={payer.id}>
                      {payer.payer_name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.payerId && <FormHelperText>{errors.payerId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Service Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Service Type</InputLabel>
                <Select
                  value={formData.serviceType}
                  onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  label="Service Type"
                >
                  {SERVICE_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Subscriber Toggle */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isSubscriber}
                    onChange={(e) => setFormData({ ...formData, isSubscriber: e.target.checked })}
                  />
                }
                label="Patient is the subscriber (policy holder)"
              />
            </Grid>

            {/* Subscriber Information (if patient is not the subscriber) */}
            <Grid item xs={12}>
              <Collapse in={!formData.isSubscriber}>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Subscriber Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Subscriber First Name"
                        value={formData.subscriberFirstName}
                        onChange={(e) => setFormData({ ...formData, subscriberFirstName: e.target.value })}
                        error={!!errors.subscriberFirstName}
                        helperText={errors.subscriberFirstName}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Subscriber Last Name"
                        value={formData.subscriberLastName}
                        onChange={(e) => setFormData({ ...formData, subscriberLastName: e.target.value })}
                        error={!!errors.subscriberLastName}
                        helperText={errors.subscriberLastName}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Subscriber DOB"
                        value={formData.subscriberDateOfBirth}
                        onChange={handleDateChange('subscriberDateOfBirth')}
                        placeholder="MM/DD/YYYY"
                        error={!!errors.subscriberDateOfBirth}
                        helperText={errors.subscriberDateOfBirth}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Collapse>
            </Grid>

            {/* Advanced Options Toggle */}
            <Grid item xs={12}>
              <Button
                size="small"
                onClick={() => setShowAdvanced(!showAdvanced)}
                endIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </Button>
            </Grid>

            {/* Advanced Options */}
            <Grid item xs={12}>
              <Collapse in={showAdvanced}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Date of Service"
                      value={formData.serviceDate}
                      onChange={handleDateChange('serviceDate')}
                      placeholder="MM/DD/YYYY"
                      helperText="Optional - defaults to today"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Rendering Provider NPI"
                      value={formData.providerNpi}
                      onChange={(e) => setFormData({ ...formData, providerNpi: e.target.value })}
                      helperText="10-digit National Provider Identifier"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Subscriber ID"
                      value={formData.subscriberId}
                      onChange={(e) => setFormData({ ...formData, subscriberId: e.target.value })}
                      helperText="If different from Member ID"
                      InputProps={{
                        endAdornment: <InfoTooltip term="subscriberId" />
                      }}
                    />
                  </Grid>
                </Grid>
              </Collapse>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              >
                {isSubmitting ? 'Verifying Coverage...' : 'Verify Eligibility'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

// ==============================|| COVERAGE DISPLAY ||============================== //

interface CoverageDisplayProps {
  response: VerificationResponse;
  coverageSummary: CoverageSummary | null;
  onRetry?: () => void;
  onExport: (format: 'pdf' | 'csv' | 'clipboard') => void;
  onPrint: () => void;
}

const CoverageDisplay = ({ response, coverageSummary, onRetry, onExport, onPrint }: CoverageDisplayProps) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('coverage');
  const coverage = coverageSummary?.coverage || response.coverage;
  const benefits = coverageSummary?.benefits || [];

  const isActive = coverage?.isActive ?? false;
  const isExpired = coverage?.cacheStatus?.expired ?? false;
  const statusColor = getCoverageStatusColor(isActive, isExpired);

  // Group benefits by type
  const benefitsByType = benefits.reduce((acc, benefit) => {
    const type = benefit.benefitType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(benefit);
    return acc;
  }, {} as Record<string, BenefitDetail[]>);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (response.status === 'PENDING' || response.status === 'SENT') {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              Verifying Coverage...
            </Typography>
            <Typography color="text.secondary">
              Request ID: {response.requestId}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (response.status === 'ERROR' || response.status === 'TIMEOUT') {
    return (
      <Card>
        <CardContent>
          <Alert
            severity="error"
            action={
              onRetry && (
                <Button color="inherit" size="small" onClick={onRetry}>
                  Retry
                </Button>
              )
            }
          >
            <Typography variant="subtitle2">Verification Failed</Typography>
            <Typography variant="body2">
              {response.status === 'TIMEOUT'
                ? 'The verification request timed out. Please try again.'
                : 'An error occurred during verification. Please try again or contact support.'}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!coverage) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="subtitle2">No Coverage Information</Typography>
            <Typography variant="body2">
              No active coverage information was found for this patient. This may indicate:
            </Typography>
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>Coverage has been terminated</li>
              <li>Patient information does not match payer records</li>
              <li>The payer system is temporarily unavailable</li>
            </ul>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="coverage-result">
      <CardContent>
        {/* Header with Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h5">Coverage Information</Typography>
              <Chip
                icon={isActive ? <CheckCircleIcon /> : <CancelIcon />}
                label={isActive ? 'Active' : 'Inactive'}
                color={statusColor}
                size="small"
              />
              {coverage.needsReverification && (
                <Chip
                  icon={<WarningIcon />}
                  label="Reverification Needed"
                  color="warning"
                  size="small"
                />
              )}
            </Stack>
            {coverage.lastVerifiedDate && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Last verified: {formatDate(coverage.lastVerifiedDate)}
                {coverage.cacheStatus && ` (${isExpired ? 'Expired' : `Valid for ${coverage.cacheStatus.daysUntilExpiration} days`})`}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Print">
              <IconButton onClick={onPrint} size="small">
                <PrintIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy to Clipboard">
              <IconButton onClick={() => onExport('clipboard')} size="small">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download PDF">
              <IconButton onClick={() => onExport('pdf')} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Coverage Period */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Coverage Period
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Effective Date <InfoTooltip term="effectiveDate" />
              </Typography>
              <Typography>{formatDate(coverage.effectiveDate)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Termination Date <InfoTooltip term="terminationDate" />
              </Typography>
              <Typography>
                {coverage.terminationDate ? formatDate(coverage.terminationDate) : 'Active'}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Member ID <InfoTooltip term="memberId" />
              </Typography>
              <Typography>{coverage.memberId || '-'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Group Number
              </Typography>
              <Typography>{coverage.groupNumber || '-'}</Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Plan Information */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Plan Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Plan Name</Typography>
              <Typography>{coverage.planName || '-'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">Plan Number</Typography>
              <Typography>{coverage.planNumber || '-'}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="text.secondary">
                Hospice Covered
              </Typography>
              <Chip
                size="small"
                label={coverage.hospiceCovered ? 'Yes' : 'No'}
                color={coverage.hospiceCovered ? 'success' : 'error'}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Financial Responsibility */}
        <Paper
          variant="outlined"
          sx={{ mb: 2, cursor: 'pointer' }}
          onClick={() => toggleSection('financial')}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2">Financial Responsibility</Typography>
            {expandedSection === 'financial' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
          <Collapse in={expandedSection === 'financial'}>
            <Divider />
            <Box sx={{ p: 2 }}>
              <Grid container spacing={3}>
                {/* Deductible */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Deductible <InfoTooltip term="deductible" />
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      {formatCurrency(coverage.deductibleAmount)}
                    </Typography>
                    {coverage.deductibleRemaining !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        ({formatCurrency(coverage.deductibleRemaining)} remaining)
                      </Typography>
                    )}
                  </Box>
                  {coverage.deductibleAmount && coverage.deductibleRemaining !== undefined && (
                    <LinearProgress
                      variant="determinate"
                      value={((coverage.deductibleAmount - coverage.deductibleRemaining) / coverage.deductibleAmount) * 100}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  )}
                </Grid>

                {/* Out of Pocket Max */}
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">
                    Out-of-Pocket Maximum <InfoTooltip term="outOfPocketMax" />
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">
                      {formatCurrency(coverage.outOfPocketMax)}
                    </Typography>
                    {coverage.outOfPocketRemaining !== undefined && (
                      <Typography variant="body2" color="text.secondary">
                        ({formatCurrency(coverage.outOfPocketRemaining)} remaining)
                      </Typography>
                    )}
                  </Box>
                  {coverage.outOfPocketMax && coverage.outOfPocketRemaining !== undefined && (
                    <LinearProgress
                      variant="determinate"
                      value={((coverage.outOfPocketMax - coverage.outOfPocketRemaining) / coverage.outOfPocketMax) * 100}
                      color="warning"
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  )}
                </Grid>

                {/* Copay */}
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    Copay <InfoTooltip term="copay" />
                  </Typography>
                  <Typography variant="h6">{formatCurrency(coverage.copayAmount)}</Typography>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </Paper>

        {/* Benefits by Type */}
        {Object.keys(benefitsByType).length > 0 && (
          <Paper
            variant="outlined"
            sx={{ mb: 2, cursor: 'pointer' }}
            onClick={() => toggleSection('benefits')}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2">Benefit Details</Typography>
              {expandedSection === 'benefits' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
            <Collapse in={expandedSection === 'benefits'}>
              <Divider />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Benefit Type</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Network</TableCell>
                      <TableCell>Auth Required</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {benefits.map((benefit) => (
                      <TableRow key={benefit.id}>
                        <TableCell>{getBenefitTypeLabel(benefit.benefitType)}</TableCell>
                        <TableCell>{benefit.serviceTypeCode}</TableCell>
                        <TableCell align="right">
                          {benefit.monetaryAmount
                            ? formatCurrency(benefit.monetaryAmount)
                            : benefit.percentageAmount
                            ? `${benefit.percentageAmount}%`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={benefit.inNetwork ? 'In-Network' : 'Out-of-Network'}
                            color={benefit.inNetwork ? 'success' : 'warning'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          {benefit.authorizationRequired ? (
                            <Chip size="small" label="Required" color="warning" />
                          ) : (
                            <Chip size="small" label="No" variant="outlined" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>
        )}

        {/* Authorization Information */}
        {coverage.authorizationRequired && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'warning.lighter' }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <WarningIcon color="warning" />
              <Box>
                <Typography variant="subtitle2">Authorization Required</Typography>
                {coverage.authorizationNumber && (
                  <Typography variant="body2">
                    Authorization #: {coverage.authorizationNumber}
                    {coverage.authorizationExpiration && (
                      <> (Expires: {formatDate(coverage.authorizationExpiration)})</>
                    )}
                  </Typography>
                )}
              </Box>
            </Stack>
          </Paper>
        )}

        {/* Limitations */}
        {coverage.limitations && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Limitations & Notes
            </Typography>
            <Typography variant="body2">{coverage.limitations}</Typography>
          </Paper>
        )}

        {/* Recommendations */}
        {coverageSummary?.recommendations && coverageSummary.recommendations.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Recommendations</Typography>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {coverageSummary.recommendations.map((rec, index) => (
                <li key={index}>
                  <Typography variant="body2">{rec}</Typography>
                </li>
              ))}
            </ul>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// ==============================|| VERIFICATION HISTORY ||============================== //

interface VerificationHistoryProps {
  patientId?: number;
}

const VerificationHistory = ({ patientId }: VerificationHistoryProps) => {
  const [requests, setRequests] = useState<EligibilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listRequests({
        page: page + 1,
        limit: rowsPerPage
      });
      setRequests(response.data);
      setTotalCount(response.pagination.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification history');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRetry = async (requestId: string) => {
    try {
      await retryVerification(requestId);
      fetchHistory();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={fetchHistory}>
          <RefreshIcon />
        </IconButton>
      }>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Request ID</TableCell>
              <TableCell>Service Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    No verification history found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              requests.map((request) => (
                <TableRow key={request.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {request.requestId}
                    </Typography>
                  </TableCell>
                  <TableCell>{getServiceTypeLabel(request.serviceType)}</TableCell>
                  <TableCell>
                    <Chip
                      label={request.status}
                      size="small"
                      color={getStatusColor(request.status)}
                    />
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>{request.sentAt ? formatDate(request.sentAt) : '-'}</TableCell>
                  <TableCell align="center">
                    {(request.status === 'ERROR' || request.status === 'TIMEOUT') && (
                      <Tooltip title="Retry">
                        <IconButton size="small" onClick={() => handleRetry(request.requestId)}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />
    </Paper>
  );
};

// ==============================|| MAIN DASHBOARD ||============================== //

const EligibilityVerificationDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [verificationResult, setVerificationResult] = useState<{
    response: VerificationResponse;
    coverageSummary: CoverageSummary | null;
  } | null>(null);
  const [recentSearches, setRecentSearches] = useState<Array<{ patientId: number; patientName: string; memberId: string }>>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eligibility_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (search: { patientId: number; patientName: string; memberId: string }) => {
    const updated = [search, ...recentSearches.filter(s => s.patientId !== search.patientId)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('eligibility_recent_searches', JSON.stringify(updated));
  };

  const handleVerificationComplete = (response: VerificationResponse, coverageSummary: CoverageSummary | null) => {
    setVerificationResult({ response, coverageSummary });

    // Save to recent searches if we have patient info
    if (coverageSummary?.coverage) {
      saveRecentSearch({
        patientId: coverageSummary.coverage.patientId,
        patientName: `Patient ${coverageSummary.coverage.patientId}`,
        memberId: coverageSummary.coverage.memberId || ''
      });
    }
  };

  const handleQuickSearch = (search: { patientId: number; patientName: string; memberId: string }) => {
    // This would pre-fill the form with the patient info
    // For now, just log it
    console.log('Quick search:', search);
  };

  const handleExport = (format: 'pdf' | 'csv' | 'clipboard') => {
    if (!verificationResult) return;

    const coverage = verificationResult.coverageSummary?.coverage || verificationResult.response.coverage;
    if (!coverage) return;

    const data = `
Eligibility Verification Results
================================
Status: ${coverage.isActive ? 'Active' : 'Inactive'}
Member ID: ${coverage.memberId || 'N/A'}
Plan: ${coverage.planName || 'N/A'}
Group: ${coverage.groupNumber || 'N/A'}
Effective Date: ${formatDate(coverage.effectiveDate)}
Termination Date: ${coverage.terminationDate ? formatDate(coverage.terminationDate) : 'Active'}

Financial Responsibility
------------------------
Deductible: ${formatCurrency(coverage.deductibleAmount)} (${formatCurrency(coverage.deductibleRemaining)} remaining)
Out-of-Pocket Max: ${formatCurrency(coverage.outOfPocketMax)} (${formatCurrency(coverage.outOfPocketRemaining)} remaining)
Copay: ${formatCurrency(coverage.copayAmount)}

Hospice Coverage: ${coverage.hospiceCovered ? 'Yes' : 'No'}
Authorization Required: ${coverage.authorizationRequired ? 'Yes' : 'No'}
${coverage.authorizationNumber ? `Authorization #: ${coverage.authorizationNumber}` : ''}

Verified: ${formatDate(coverage.lastVerifiedDate)}
    `.trim();

    if (format === 'clipboard') {
      navigator.clipboard.writeText(data).then(() => {
        alert('Copied to clipboard!');
      });
    } else if (format === 'csv') {
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eligibility-${coverage.memberId || 'verification'}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      // For PDF, we'd use a library like jspdf - for now, open print dialog
      handlePrint();
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('coverage-result');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Eligibility Verification</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .chip { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
            .active { background: #e8f5e9; color: #2e7d32; }
            .inactive { background: #ffebee; color: #c62828; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>Eligibility Verification Results</h1>
          ${printContent.innerHTML}
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Printed on ${new Date().toLocaleString()}
          </p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleRetry = async () => {
    if (!verificationResult?.response.requestId) return;
    try {
      const response = await retryVerification(verificationResult.response.requestId);
      setVerificationResult({ ...verificationResult, response });
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  return (
    <MainCard
      title="Eligibility Verification"
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          <LocalHospitalIcon color="primary" />
          <Typography variant="body2" color="text.secondary">
            Healthcare Coverage Verification System
          </Typography>
        </Stack>
      }
    >
      <Box>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
            <Tab label="Verify Eligibility" icon={<SearchIcon />} iconPosition="start" />
            <Tab label="Verification History" icon={<HistoryIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Verify Eligibility Tab */}
        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} lg={verificationResult ? 5 : 12}>
              <VerificationForm
                onVerificationComplete={handleVerificationComplete}
                recentSearches={recentSearches}
                onQuickSearch={handleQuickSearch}
              />
            </Grid>
            {verificationResult && (
              <Grid item xs={12} lg={7}>
                <CoverageDisplay
                  response={verificationResult.response}
                  coverageSummary={verificationResult.coverageSummary}
                  onRetry={handleRetry}
                  onExport={handleExport}
                  onPrint={handlePrint}
                />
              </Grid>
            )}
          </Grid>
        )}

        {/* Verification History Tab */}
        {tabValue === 1 && (
          <VerificationHistory />
        )}
      </Box>
    </MainCard>
  );
};

export default EligibilityVerificationDashboard;
