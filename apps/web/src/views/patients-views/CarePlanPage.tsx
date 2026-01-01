'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
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
  Badge
} from '@mui/material';
import MainCard from 'components/MainCard';
import {
  DocumentText,
  Flag,
  Activity,
  Add,
  Refresh,
  Save2,
  TickCircle,
  CloseCircle,
  Warning2,
  Timer1,
  Chart
} from 'iconsax-react';
import AuthService from 'types/AuthService';
import Swal from 'sweetalert2';

// Import sub-components
import CarePlanOverviewTab from './care-plan/CarePlanOverviewTab';
import GoalsTab from './care-plan/GoalsTab';
import InterventionsTab from './care-plan/InterventionsTab';
import ProgressTab from './care-plan/ProgressTab';

// Import API functions
import {
  getPatientCarePlans,
  getCarePlanById,
  createCarePlan,
  updateCarePlan,
  CarePlan,
  Problem,
  Goal,
  Intervention
} from '../../api/carePlan';
import { getPatientById } from '../../api/patient';

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
      id={`care-plan-tabpanel-${index}`}
      aria-labelledby={`care-plan-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `care-plan-tab-${index}`,
    'aria-controls': `care-plan-tabpanel-${index}`
  };
}

// ==============================|| STATUS HELPERS ||============================== //

const getStatusColor = (status: string) => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    DRAFT: 'default',
    ACTIVE: 'success',
    REVISED: 'info',
    INACTIVE: 'warning',
    ARCHIVED: 'default',
    PENDING_SIGNATURE: 'warning',
    SIGNED: 'success',
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    ACHIEVED: 'success',
    PARTIALLY_ACHIEVED: 'info',
    NOT_ACHIEVED: 'error',
    DISCONTINUED: 'default',
    PLANNED: 'default',
    COMPLETED: 'success',
    ON_HOLD: 'warning'
  };
  return statusColors[status] || 'default';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACHIEVED':
    case 'COMPLETED':
    case 'SIGNED':
      return <TickCircle size={16} />;
    case 'DISCONTINUED':
    case 'NOT_ACHIEVED':
      return <CloseCircle size={16} />;
    case 'PENDING_SIGNATURE':
    case 'ON_HOLD':
      return <Warning2 size={16} />;
    case 'IN_PROGRESS':
      return <Timer1 size={16} />;
    default:
      return null;
  }
};

// ==============================|| CARE PLAN PAGE ||============================== //

const CarePlanPage = () => {
  const { id } = useParams();
  const patientId = Array.isArray(id) ? id[0] : id;
  const { logout } = AuthService();

  // State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Patient data
  const [patientData, setPatientData] = useState<any>(null);

  // Care plan data
  const [carePlans, setCarePlans] = useState<CarePlan[]>([]);
  const [activeCarePlan, setActiveCarePlan] = useState<CarePlan | null>(null);
  const [carePlanVersion, setCarePlanVersion] = useState<number>(1);

  // Form data for the active care plan
  const [formData, setFormData] = useState<Partial<CarePlan>>({});

  // Goals and interventions (loaded separately for the active care plan)
  const [problems, setProblems] = useState<Problem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);

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

  const fetchCarePlans = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const response = await getPatientCarePlans(patientId);
      const plans = response.data || [];
      setCarePlans(plans);

      // Find active care plan or most recent draft
      const activePlan = plans.find((p: CarePlan) => p.care_plan_status === 'ACTIVE') ||
        plans.find((p: CarePlan) => p.care_plan_status === 'DRAFT') ||
        plans[0];

      if (activePlan) {
        await loadCarePlanDetails(activePlan.id);
      }
    } catch (error: any) {
      console.error('Error fetching care plans:', error);
      if (error.response?.status === 401) {
        logout();
      }
      setError('Failed to load care plans');
    } finally {
      setLoading(false);
    }
  }, [patientId, logout]);

  const loadCarePlanDetails = async (carePlanId: number) => {
    try {
      const response = await getCarePlanById(carePlanId);
      const carePlan = response.data;
      setActiveCarePlan(carePlan);
      setFormData(carePlan);
      setCarePlanVersion(carePlan.version || 1);
      setProblems(carePlan.problems || []);
      setGoals(carePlan.goals || []);
      setInterventions(carePlan.interventions || []);
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Error loading care plan details:', error);
      setError('Failed to load care plan details');
    }
  };

  const refreshData = async () => {
    if (activeCarePlan) {
      await loadCarePlanDetails(activeCarePlan.id);
    }
    await fetchCarePlans();
  };

  // ==============================|| EFFECTS ||============================== //

  useEffect(() => {
    fetchPatientData();
    fetchCarePlans();
  }, [fetchPatientData, fetchCarePlans]);

  // Auto-save effect
  useEffect(() => {
    if (autoSaveEnabled && hasUnsavedChanges && activeCarePlan) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for 30 seconds
      autoSaveTimerRef.current = setTimeout(() => {
        handleSave(true);
      }, 30000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSaveEnabled, formData]);

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
        text: 'You have unsaved changes. Do you want to save before switching tabs?',
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

  const handleFormChange = (updates: Partial<CarePlan>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async (isAutoSave: boolean = false) => {
    if (!activeCarePlan) return;

    try {
      setSaving(true);

      // Include version for optimistic locking
      const updateData = {
        ...formData,
        version: carePlanVersion
      };

      const response = await updateCarePlan(activeCarePlan.id, updateData);

      if (response.status === 200) {
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        setCarePlanVersion(response.data.version);

        if (!isAutoSave) {
          Swal.fire({
            icon: 'success',
            title: 'Saved',
            text: 'Care plan saved successfully',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
    } catch (error: any) {
      console.error('Error saving care plan:', error);

      // Handle concurrent update conflict
      if (error.response?.status === 409) {
        const result = await Swal.fire({
          icon: 'warning',
          title: 'Concurrent Update',
          text: 'This care plan has been modified by another user. Would you like to reload the latest version?',
          showCancelButton: true,
          confirmButtonText: 'Reload',
          cancelButtonText: 'Keep My Changes'
        });

        if (result.isConfirmed) {
          await loadCarePlanDetails(activeCarePlan.id);
        }
      } else if (!isAutoSave) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save care plan. Please try again.'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCarePlan = async () => {
    if (!patientId) return;

    try {
      const response = await createCarePlan(patientId, {
        care_plan_status: 'DRAFT',
        effective_date: new Date().toISOString().split('T')[0]
      });

      if (response.status === 201) {
        await fetchCarePlans();
        Swal.fire({
          icon: 'success',
          title: 'Care Plan Created',
          text: 'New care plan has been created.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      console.error('Error creating care plan:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to create care plan. Please try again.'
      });
    }
  };

  const handleCarePlanSelect = async (carePlan: CarePlan) => {
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
    await loadCarePlanDetails(carePlan.id);
  };

  // Callbacks for child components to update data
  const onGoalsUpdate = useCallback((updatedGoals: Goal[]) => {
    setGoals(updatedGoals);
  }, []);

  const onInterventionsUpdate = useCallback((updatedInterventions: Intervention[]) => {
    setInterventions(updatedInterventions);
  }, []);

  const onProblemsUpdate = useCallback((updatedProblems: Problem[]) => {
    setProblems(updatedProblems);
  }, []);

  // ==============================|| RENDER ||============================== //

  if (loading) {
    return (
      <MainCard title="Care Plan">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (error) {
    return (
      <MainCard title="Care Plan">
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchCarePlans} startIcon={<Refresh size={18} />}>
          Retry
        </Button>
      </MainCard>
    );
  }

  // Calculate statistics for badges
  const activeGoalsCount = goals.filter(g => g.goal_status === 'IN_PROGRESS' || g.goal_status === 'NOT_STARTED').length;
  const activeInterventionsCount = interventions.filter(i => i.intervention_status === 'IN_PROGRESS' || i.intervention_status === 'PLANNED').length;
  const achievedGoalsCount = goals.filter(g => g.goal_status === 'ACHIEVED').length;

  return (
    <MainCard
      title={
        <Stack direction="row" alignItems="center" spacing={2}>
          <Typography variant="h4">Care Plan</Typography>
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
            disabled={!hasUnsavedChanges || saving}
          >
            Save
          </Button>
        </Stack>
      }
    >
      {/* Care Plan Selector */}
      {carePlans.length > 0 ? (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {carePlans.map((plan) => (
              <Chip
                key={plan.id}
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {getStatusIcon(plan.care_plan_status)}
                    <span>
                      v{plan.version} - {plan.care_plan_status}
                      {plan.effective_date && ` (${new Date(plan.effective_date).toLocaleDateString()})`}
                    </span>
                  </Stack>
                }
                color={activeCarePlan?.id === plan.id ? 'primary' : getStatusColor(plan.care_plan_status)}
                variant={activeCarePlan?.id === plan.id ? 'filled' : 'outlined'}
                onClick={() => handleCarePlanSelect(plan)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
            <Chip
              label={<Add size={16} />}
              variant="outlined"
              onClick={handleCreateCarePlan}
              sx={{ cursor: 'pointer' }}
            />
          </Stack>
        </Box>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }} action={
          <Button color="inherit" size="small" onClick={handleCreateCarePlan}>
            Create Care Plan
          </Button>
        }>
          No care plans found for this patient. Create one to get started.
        </Alert>
      )}

      {activeCarePlan && (
        <>
          {/* Status Bar */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={activeCarePlan.care_plan_status}
                    color={getStatusColor(activeCarePlan.care_plan_status)}
                    size="small"
                    icon={getStatusIcon(activeCarePlan.care_plan_status) || undefined}
                  />
                </Stack>
              </Grid>
              <Grid item xs={6} md={3}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Effective Date</Typography>
                  <Typography variant="body2">
                    {activeCarePlan.effective_date ? new Date(activeCarePlan.effective_date).toLocaleDateString() : 'Not set'}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6} md={3}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Next Review</Typography>
                  <Typography variant="body2">
                    {activeCarePlan.next_review_date ? new Date(activeCarePlan.next_review_date).toLocaleDateString() : 'Not set'}
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={6} md={3}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="text.secondary">Version</Typography>
                  <Typography variant="body2">v{activeCarePlan.version || 1}</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="care plan tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DocumentText size={18} />
                    <span>Overview</span>
                  </Stack>
                }
                {...a11yProps(0)}
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Badge badgeContent={activeGoalsCount} color="primary" max={99}>
                      <Flag size={18} />
                    </Badge>
                    <span>Goals</span>
                  </Stack>
                }
                {...a11yProps(1)}
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Badge badgeContent={activeInterventionsCount} color="primary" max={99}>
                      <Activity size={18} />
                    </Badge>
                    <span>Interventions</span>
                  </Stack>
                }
                {...a11yProps(2)}
              />
              <Tab
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Badge badgeContent={achievedGoalsCount} color="success" max={99}>
                      <Chart size={18} />
                    </Badge>
                    <span>Progress</span>
                  </Stack>
                }
                {...a11yProps(3)}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            <CarePlanOverviewTab
              carePlan={activeCarePlan}
              formData={formData}
              problems={problems}
              onFormChange={handleFormChange}
              onProblemsUpdate={onProblemsUpdate}
              patientId={patientId}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <GoalsTab
              patientId={patientId}
              carePlanId={activeCarePlan.id}
              goals={goals}
              problems={problems}
              onGoalsUpdate={onGoalsUpdate}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <InterventionsTab
              patientId={patientId}
              carePlanId={activeCarePlan.id}
              interventions={interventions}
              goals={goals}
              problems={problems}
              onInterventionsUpdate={onInterventionsUpdate}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <ProgressTab
              goals={goals}
              interventions={interventions}
              carePlan={activeCarePlan}
            />
          </TabPanel>
        </>
      )}
    </MainCard>
  );
};

export default CarePlanPage;
