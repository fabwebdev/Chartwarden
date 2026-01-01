'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import MainCard from 'components/MainCard';
import {
  DocumentText,
  Health,
  Activity,
  Refresh,
  Save2,
  TickCircle,
  CloseCircle,
  Warning2,
  Timer1,
  Chart,
  Send2,
  Edit2,
  Personalcard,
  MedalStar,
  Heart,
  Stickynote
} from 'iconsax-react';
import AuthService from 'types/AuthService';
import Swal from 'sweetalert2';

// Import sub-components
import SectionA_AdministrativeInfo from './components/SectionA_AdministrativeInfo';
import SectionF_Preferences from './components/SectionF_Preferences';
import SectionI_Diagnoses from './components/SectionI_Diagnoses';
import SectionJ_HealthConditions from './components/SectionJ_HealthConditions';
import SectionM_SkinConditions from './components/SectionM_SkinConditions';
import SectionN_Medications from './components/SectionN_Medications';
import SectionZ_RecordAdmin from './components/SectionZ_RecordAdmin';

// Import API functions
import {
  getPatientHOPEAssessments,
  getHOPEAssessmentById,
  createHOPEAssessment,
  updateHOPEAssessment,
  validateHOPEAssessment,
  signHOPEAssessment,
  submitHOPEAssessment,
  HOPEAssessment,
  HOPEAssessmentFormData,
  HOPEAssessmentType,
  HOPEAssessmentStatus
} from '../../../api/hopeAssessment';
import { getPatientById } from '../../../api/patient';

// ==============================|| TAB PANEL ||============================== //

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`hope-tabpanel-${index}`}
      aria-labelledby={`hope-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `hope-tab-${index}`,
    'aria-controls': `hope-tabpanel-${index}`
  };
}

// ==============================|| CONSTANTS ||============================== //

const ASSESSMENT_TYPES: { value: HOPEAssessmentType; label: string }[] = [
  { value: 'ADMISSION', label: 'Admission (Within 5 days)' },
  { value: 'HUV1', label: 'HUV1 (Days 6-15)' },
  { value: 'HUV2', label: 'HUV2 (Days 16-30)' },
  { value: 'DISCHARGE', label: 'Discharge' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'RESUMPTION', label: 'Resumption' },
  { value: 'RECERTIFICATION', label: 'Recertification' },
  { value: 'SYMPTOM_FOLLOWUP', label: 'Symptom Follow-up Visit' }
];

const SECTION_TABS = [
  { label: 'Section A', icon: <Personalcard size={18} />, name: 'Administrative Info' },
  { label: 'Section F', icon: <Heart size={18} />, name: 'Preferences' },
  { label: 'Section I', icon: <MedalStar size={18} />, name: 'Diagnoses' },
  { label: 'Section J', icon: <Health size={18} />, name: 'Health Conditions' },
  { label: 'Section M', icon: <Activity size={18} />, name: 'Skin Conditions' },
  { label: 'Section N', icon: <Stickynote size={18} />, name: 'Medications' },
  { label: 'Section Z', icon: <DocumentText size={18} />, name: 'Record Admin' }
];

// ==============================|| STATUS HELPERS ||============================== //

const getStatusColor = (status: string) => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    COMPLETED: 'info',
    SIGNED: 'success',
    SUBMITTED: 'success',
    ACCEPTED: 'success',
    REJECTED: 'error',
    OVERDUE: 'error'
  };
  return statusColors[status] || 'default';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'SIGNED':
    case 'SUBMITTED':
    case 'ACCEPTED':
      return <TickCircle size={16} />;
    case 'REJECTED':
      return <CloseCircle size={16} />;
    case 'OVERDUE':
      return <Warning2 size={16} />;
    case 'IN_PROGRESS':
      return <Timer1 size={16} />;
    default:
      return null;
  }
};

const getInitialFormData = (): HOPEAssessmentFormData => ({
  assessment_type: 'ADMISSION',
  assessment_status: 'NOT_STARTED',
  assessment_date: new Date().toISOString().split('T')[0],
  a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
  i0010_principal_diagnosis_icd10: '',
  i0010_principal_diagnosis_description: ''
});

// ==============================|| HOPE ASSESSMENT PAGE ||============================== //

const HopeAssessmentPage = () => {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const assessmentIdParam = searchParams.get('assessmentId');
  const { logout } = AuthService();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  // Patient data
  const [patientData, setPatientData] = useState<any>(null);

  // Assessment data
  const [assessments, setAssessments] = useState<HOPEAssessment[]>([]);
  const [activeAssessment, setActiveAssessment] = useState<HOPEAssessment | null>(null);
  const [formData, setFormData] = useState<HOPEAssessmentFormData>(getInitialFormData());
  const [isNewAssessment, setIsNewAssessment] = useState(false);

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==============================|| DATA FETCHING ||============================== //

  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;
    try {
      const response = await getPatientById(patientId);
      setPatientData(response);
    } catch (error: any) {
      console.error('Error fetching patient data:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  }, [patientId, logout]);

  const fetchAssessments = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const response = await getPatientHOPEAssessments(patientId);
      const assessmentList = response.data || [];
      setAssessments(assessmentList);

      // Load specific assessment if ID provided
      if (assessmentIdParam) {
        await loadAssessmentDetails(parseInt(assessmentIdParam));
      } else if (assessmentList.length > 0) {
        // Find in-progress or most recent assessment
        const inProgressAssessment = assessmentList.find(
          (a: HOPEAssessment) => a.assessment_status === 'IN_PROGRESS'
        );
        const targetAssessment = inProgressAssessment || assessmentList[0];
        await loadAssessmentDetails(targetAssessment.id);
      } else {
        // No assessments - prepare new assessment form
        setIsNewAssessment(true);
        setFormData(getInitialFormData());
      }
    } catch (error: any) {
      console.error('Error fetching HOPE assessments:', error);
      if (error.response?.status === 401) {
        logout();
      }
      setError('Failed to load HOPE assessments');
    } finally {
      setLoading(false);
    }
  }, [patientId, assessmentIdParam, logout]);

  const loadAssessmentDetails = async (assessmentId: number) => {
    try {
      const response = await getHOPEAssessmentById(assessmentId);
      const assessment = response.data;
      setActiveAssessment(assessment);
      setFormData(assessment);
      setIsNewAssessment(false);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error loading assessment details:', error);
      setError('Failed to load assessment details');
    }
  };

  const refreshData = async () => {
    if (activeAssessment) {
      await loadAssessmentDetails(activeAssessment.id);
    }
    await fetchAssessments();
  };

  // ==============================|| EFFECTS ||============================== //

  useEffect(() => {
    fetchPatientData();
    fetchAssessments();
  }, [fetchPatientData, fetchAssessments]);

  // Auto-save effect
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges && activeAssessment && !isNewAssessment) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSaveEnabled, formData, activeAssessment, isNewAssessment]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ==============================|| HANDLERS ||============================== //

  const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Do you want to save before switching sections?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Save',
        denyButtonText: 'Discard',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await handleSave(false);
      } else if (result.isDismissed) {
        return;
      }
    }
    setTabValue(newValue);
  };

  const handleFormChange = (updates: Partial<HOPEAssessmentFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleAssessmentTypeChange = (e: SelectChangeEvent<HOPEAssessmentType>) => {
    const newType = e.target.value as HOPEAssessmentType;
    setFormData(prev => ({ ...prev, assessment_type: newType }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async (isAutoSave: boolean = false) => {
    if (!patientId) return;

    try {
      setSaving(true);

      if (isNewAssessment) {
        // Create new assessment
        const response = await createHOPEAssessment(patientId, {
          ...formData,
          assessment_status: 'IN_PROGRESS'
        });

        if (response.status === 201) {
          setActiveAssessment(response.data);
          setFormData(response.data);
          setIsNewAssessment(false);
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          await fetchAssessments();

          if (!isAutoSave) {
            Swal.fire({
              icon: 'success',
              title: 'Assessment Created',
              text: 'HOPE assessment created successfully',
              timer: 1500,
              showConfirmButton: false
            });
          }
        }
      } else if (activeAssessment) {
        // Update existing assessment
        const response = await updateHOPEAssessment(activeAssessment.id, {
          ...formData,
          assessment_status: formData.assessment_status === 'NOT_STARTED' ? 'IN_PROGRESS' : formData.assessment_status
        });

        if (response.status === 200) {
          setLastSaved(new Date());
          setHasUnsavedChanges(false);
          setFormData(response.data);

          if (!isAutoSave) {
            Swal.fire({
              icon: 'success',
              title: 'Saved',
              text: 'Assessment saved successfully',
              timer: 1500,
              showConfirmButton: false
            });
          }
        }
      }
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      if (!isAutoSave) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to save assessment. Please try again.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateNewAssessment = () => {
    setActiveAssessment(null);
    setFormData(getInitialFormData());
    setIsNewAssessment(true);
    setTabValue(0);
    setHasUnsavedChanges(false);
  };

  const handleAssessmentSelect = async (assessment: HOPEAssessment) => {
    if (hasUnsavedChanges) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Do you want to save before switching?',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Save',
        denyButtonText: 'Discard',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        await handleSave(false);
      } else if (result.isDismissed) {
        return;
      }
    }
    await loadAssessmentDetails(assessment.id);
    setTabValue(0);
  };

  const handleValidate = async () => {
    if (!activeAssessment) return;

    try {
      const response = await validateHOPEAssessment(activeAssessment.id);
      const result = response.data;

      if (result.valid) {
        setValidationErrors([]);
        Swal.fire({
          icon: 'success',
          title: 'Validation Passed',
          text: 'Assessment is valid and ready for signing.'
        });
      } else {
        setValidationErrors(result.errors);
        Swal.fire({
          icon: 'warning',
          title: 'Validation Issues',
          html: `<p>Please fix the following issues:</p><ul>${result.errors.map((e: any) => `<li>${e.message}</li>`).join('')}</ul>`,
          confirmButtonText: 'OK'
        });
      }
    } catch (error: any) {
      console.error('Error validating assessment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: error.response?.data?.message || 'Failed to validate assessment.'
      });
    }
  };

  const handleSign = async () => {
    if (!activeAssessment) return;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Sign Assessment?',
      text: 'Once signed, the assessment cannot be modified. Are you sure you want to sign?',
      showCancelButton: true,
      confirmButtonText: 'Sign',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await signHOPEAssessment(activeAssessment.id);
        if (response.status === 200) {
          await loadAssessmentDetails(activeAssessment.id);
          Swal.fire({
            icon: 'success',
            title: 'Assessment Signed',
            text: 'Assessment has been electronically signed.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error signing assessment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to sign assessment.'
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!activeAssessment) return;

    const result = await Swal.fire({
      icon: 'question',
      title: 'Submit to CMS?',
      text: 'Submit this assessment to the CMS iQIES system?',
      showCancelButton: true,
      confirmButtonText: 'Submit',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await submitHOPEAssessment(activeAssessment.id);
        if (response.status === 200) {
          await loadAssessmentDetails(activeAssessment.id);
          Swal.fire({
            icon: 'success',
            title: 'Submitted',
            text: 'Assessment has been submitted to CMS.',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error submitting assessment:', error);
        Swal.fire({
          icon: 'error',
          title: 'Submission Error',
          text: error.response?.data?.message || 'Failed to submit assessment.'
        });
      }
    }
  };

  // Check if assessment is editable
  const isEditable = !activeAssessment || ['NOT_STARTED', 'IN_PROGRESS'].includes(activeAssessment.assessment_status);

  // ==============================|| RENDER ||============================== //

  if (loading) {
    return (
      <MainCard title="HOPE Assessment">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard title="HOPE Assessment">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchAssessments} startIcon={<Refresh size={18} />}>
          Retry
        </Button>
      </MainCard>
    );
  }

  return (
    <MainCard
      title={
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4">HOPE Assessment</Typography>
          {patientData && (
            <Typography variant="body2" color="text.secondary">
              {patientData.first_name} {patientData.last_name} | MRN: {patientData.mrn || 'N/A'}
            </Typography>
          )}
        </Stack>
      }
      secondary={
        <Stack direction="row" spacing={1} alignItems="center">
          {saving && <CircularProgress size={20} />}
          {lastSaved && (
            <Typography variant="caption" color="text.secondary">
              Last saved: {lastSaved.toLocaleTimeString()}
            </Typography>
          )}
          {hasUnsavedChanges && (
            <Chip label="Unsaved changes" color="warning" size="small" />
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={refreshData} size="small">
              <Refresh size={18} />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Save2 size={18} />}
            onClick={() => handleSave(false)}
            disabled={!hasUnsavedChanges || saving || !isEditable}
          >
            Save
          </Button>
        </Stack>
      }
    >
      {/* Assessment Selector */}
      {assessments.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              Assessments:
            </Typography>
            {assessments.slice(0, 5).map((assessment) => (
              <Chip
                key={assessment.id}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {getStatusIcon(assessment.assessment_status)}
                    <span>
                      {assessment.assessment_type}
                      {' - '}
                      {new Date(assessment.assessment_date).toLocaleDateString()}
                    </span>
                  </Stack>
                }
                color={activeAssessment?.id === assessment.id ? 'primary' : getStatusColor(assessment.assessment_status)}
                variant={activeAssessment?.id === assessment.id ? 'filled' : 'outlined'}
                onClick={() => handleAssessmentSelect(assessment)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
            <Tooltip title="New Assessment">
              <Chip
                label="+ New"
                variant="outlined"
                onClick={handleCreateNewAssessment}
                sx={{ cursor: 'pointer' }}
              />
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* New Assessment Type Selector */}
      {isNewAssessment && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">Create new assessment:</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Assessment Type</InputLabel>
              <Select
                value={formData.assessment_type as HOPEAssessmentType}
                label="Assessment Type"
                onChange={handleAssessmentTypeChange}
              >
                {ASSESSMENT_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleSave(false)}
            >
              Create Assessment
            </Button>
          </Stack>
        </Alert>
      )}

      {/* Assessment Status Bar */}
      {(activeAssessment || isNewAssessment) && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={2}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Type</Typography>
                <Chip
                  label={formData.assessment_type}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Grid>
            <Grid item xs={6} md={2}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Status</Typography>
                <Chip
                  label={formData.assessment_status || 'NOT_STARTED'}
                  color={getStatusColor(formData.assessment_status || 'NOT_STARTED')}
                  size="small"
                  icon={getStatusIcon(formData.assessment_status || 'NOT_STARTED') || undefined}
                />
              </Stack>
            </Grid>
            <Grid item xs={6} md={2}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Assessment Date</Typography>
                <Typography variant="body2">
                  {formData.assessment_date ? new Date(formData.assessment_date).toLocaleDateString() : 'Not set'}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={6} md={2}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">Reference Date</Typography>
                <Typography variant="body2">
                  {formData.a0310_assessment_reference_date ? new Date(formData.a0310_assessment_reference_date).toLocaleDateString() : 'Not set'}
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {activeAssessment && formData.assessment_status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit2 size={16} />}
                      onClick={handleValidate}
                    >
                      Validate
                    </Button>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<TickCircle size={16} />}
                      onClick={handleSign}
                    >
                      Sign
                    </Button>
                  </>
                )}
                {activeAssessment && formData.assessment_status === 'SIGNED' && (
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<Send2 size={16} />}
                    onClick={handleSubmit}
                  >
                    Submit to CMS
                  </Button>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Validation Errors:</Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="hope assessment tabs"
          variant="scrollable"
          scrollButtons="auto"
        >
          {SECTION_TABS.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  {tab.icon}
                  <span>{tab.label}</span>
                </Stack>
              }
              {...a11yProps(index)}
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <SectionA_AdministrativeInfo
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
          patientData={patientData}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <SectionF_Preferences
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <SectionI_Diagnoses
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <SectionJ_HealthConditions
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <SectionM_SkinConditions
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={5}>
        <SectionN_Medications
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={6}>
        <SectionZ_RecordAdmin
          formData={formData}
          onFormChange={handleFormChange}
          isEditable={isEditable}
          assessment={activeAssessment}
        />
      </TabPanel>
    </MainCard>
  );
};

export default HopeAssessmentPage;
