'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Stack,
  Button,
  Chip,
  IconButton,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Modal,
  LinearProgress,
  Collapse,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  CloseCircle,
  ArrowDown2,
  ArrowUp2,
  Flag,
  Activity
} from 'iconsax-react';
import Swal from 'sweetalert2';

import {
  Goal,
  Problem,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  discontinueGoal,
  addGoalMilestone
} from '../../../api/carePlan';

// ==============================|| CONSTANTS ||============================== //

const GOAL_STATUSES = [
  { value: 'NOT_STARTED', label: 'Not Started', color: 'default' as const },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primary' as const },
  { value: 'ACHIEVED', label: 'Achieved', color: 'success' as const },
  { value: 'PARTIALLY_ACHIEVED', label: 'Partially Achieved', color: 'info' as const },
  { value: 'NOT_ACHIEVED', label: 'Not Achieved', color: 'error' as const },
  { value: 'DISCONTINUED', label: 'Discontinued', color: 'default' as const },
  { value: 'REVISED', label: 'Revised', color: 'info' as const }
];

const PROGRESS_LEVELS = [
  { value: 'NO_PROGRESS', label: 'No Progress', percent: 0 },
  { value: 'MINIMAL_PROGRESS', label: 'Minimal Progress', percent: 25 },
  { value: 'MODERATE_PROGRESS', label: 'Moderate Progress', percent: 50 },
  { value: 'SIGNIFICANT_PROGRESS', label: 'Significant Progress', percent: 75 },
  { value: 'GOAL_ACHIEVED', label: 'Goal Achieved', percent: 100 },
  { value: 'REGRESSION', label: 'Regression', percent: 0 }
];

const DISCIPLINES = [
  { value: 'NURSING', label: 'Nursing' },
  { value: 'PHYSICIAN', label: 'Physician' },
  { value: 'SOCIAL_WORK', label: 'Social Work' },
  { value: 'CHAPLAIN', label: 'Chaplain' },
  { value: 'AIDE', label: 'Hospice Aide' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'VOLUNTEER', label: 'Volunteer' }
];

// ==============================|| MODAL STYLES ||============================== //

const modalStyle = {
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 600, md: 700 },
  maxHeight: '90vh',
  overflow: 'auto',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4
};

// ==============================|| INTERFACES ||============================== //

interface GoalsTabProps {
  patientId: string;
  carePlanId: number;
  goals: Goal[];
  problems: Problem[];
  onGoalsUpdate: (goals: Goal[]) => void;
}

interface GoalFormData {
  goal_description: string;
  goal_status: string;
  progress_level: string;
  target_date: string;
  start_date: string;
  measurable_outcome: string;
  outcome_criteria: string;
  evaluation_method: string;
  primary_discipline: string;
  problem_id: string;
  patient_agreement: boolean;
  family_agreement: boolean;
  progress_notes: string;
  barriers_to_achievement: string;
  modifications_needed: string;
}

interface ProgressFormData {
  progress_level: string;
  progress_notes: string;
  barriers_to_achievement: string;
  modifications_needed: string;
}

interface MilestoneFormData {
  milestone_description: string;
  milestone_date: string;
  achieved: boolean;
  notes: string;
}

const initialGoalForm: GoalFormData = {
  goal_description: '',
  goal_status: 'NOT_STARTED',
  progress_level: '',
  target_date: '',
  start_date: new Date().toISOString().split('T')[0],
  measurable_outcome: '',
  outcome_criteria: '',
  evaluation_method: '',
  primary_discipline: '',
  problem_id: '',
  patient_agreement: false,
  family_agreement: false,
  progress_notes: '',
  barriers_to_achievement: '',
  modifications_needed: ''
};

const initialProgressForm: ProgressFormData = {
  progress_level: '',
  progress_notes: '',
  barriers_to_achievement: '',
  modifications_needed: ''
};

const initialMilestoneForm: MilestoneFormData = {
  milestone_description: '',
  milestone_date: new Date().toISOString().split('T')[0],
  achieved: false,
  notes: ''
};

// ==============================|| GOALS TAB ||============================== //

const GoalsTab = ({
  patientId,
  carePlanId,
  goals,
  problems,
  onGoalsUpdate
}: GoalsTabProps) => {
  // State for goal modal
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalFormData, setGoalFormData] = useState<GoalFormData>(initialGoalForm);
  const [goalFormErrors, setGoalFormErrors] = useState<Record<string, string>>({});

  // State for progress update modal
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null);
  const [progressFormData, setProgressFormData] = useState<ProgressFormData>(initialProgressForm);

  // State for milestone modal
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [milestoneGoal, setMilestoneGoal] = useState<Goal | null>(null);
  const [milestoneFormData, setMilestoneFormData] = useState<MilestoneFormData>(initialMilestoneForm);

  // State for expanded goal cards
  const [expandedGoals, setExpandedGoals] = useState<Record<number, boolean>>({});

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // ==============================|| HELPERS ||============================== //

  const getProgressPercent = (progressLevel: string | undefined): number => {
    const found = PROGRESS_LEVELS.find(p => p.value === progressLevel);
    return found?.percent || 0;
  };

  const getStatusColor = (status: string) => {
    const found = GOAL_STATUSES.find(s => s.value === status);
    return found?.color || 'default';
  };

  const toggleGoalExpanded = (goalId: number) => {
    setExpandedGoals(prev => ({
      ...prev,
      [goalId]: !prev[goalId]
    }));
  };

  const filteredGoals = filterStatus === 'all'
    ? goals
    : goals.filter(g => g.goal_status === filterStatus);

  // ==============================|| GOAL HANDLERS ||============================== //

  const handleOpenGoalModal = (goal?: Goal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalFormData({
        goal_description: goal.goal_description || '',
        goal_status: goal.goal_status || 'NOT_STARTED',
        progress_level: goal.progress_level || '',
        target_date: goal.target_date || '',
        start_date: goal.start_date || new Date().toISOString().split('T')[0],
        measurable_outcome: goal.measurable_outcome || '',
        outcome_criteria: goal.outcome_criteria || '',
        evaluation_method: goal.evaluation_method || '',
        primary_discipline: goal.primary_discipline || '',
        problem_id: goal.problem_id?.toString() || '',
        patient_agreement: goal.patient_agreement || false,
        family_agreement: goal.family_agreement || false,
        progress_notes: goal.progress_notes || '',
        barriers_to_achievement: goal.barriers_to_achievement || '',
        modifications_needed: goal.modifications_needed || ''
      });
    } else {
      setEditingGoal(null);
      setGoalFormData(initialGoalForm);
    }
    setGoalFormErrors({});
    setGoalModalOpen(true);
  };

  const handleCloseGoalModal = () => {
    setGoalModalOpen(false);
    setEditingGoal(null);
    setGoalFormData(initialGoalForm);
    setGoalFormErrors({});
  };

  const handleGoalFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setGoalFormData(prev => ({ ...prev, [name]: value }));
    if (goalFormErrors[name]) {
      setGoalFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleGoalCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setGoalFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateGoalForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!goalFormData.goal_description.trim()) {
      errors.goal_description = 'Goal description is required';
    }
    if (!goalFormData.start_date) {
      errors.start_date = 'Start date is required';
    }
    if (goalFormData.target_date && goalFormData.start_date && goalFormData.target_date < goalFormData.start_date) {
      errors.target_date = 'Target date must be after start date';
    }

    setGoalFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveGoal = async () => {
    if (!validateGoalForm()) return;

    try {
      const goalData: Partial<Goal> = {
        goal_description: goalFormData.goal_description,
        goal_status: goalFormData.goal_status as Goal['goal_status'],
        progress_level: goalFormData.progress_level as Goal['progress_level'] || undefined,
        target_date: goalFormData.target_date || undefined,
        start_date: goalFormData.start_date || undefined,
        measurable_outcome: goalFormData.measurable_outcome || undefined,
        outcome_criteria: goalFormData.outcome_criteria || undefined,
        evaluation_method: goalFormData.evaluation_method || undefined,
        primary_discipline: goalFormData.primary_discipline || undefined,
        problem_id: goalFormData.problem_id ? parseInt(goalFormData.problem_id) : undefined,
        patient_agreement: goalFormData.patient_agreement,
        family_agreement: goalFormData.family_agreement,
        progress_notes: goalFormData.progress_notes || undefined,
        barriers_to_achievement: goalFormData.barriers_to_achievement || undefined,
        modifications_needed: goalFormData.modifications_needed || undefined,
        care_plan_id: carePlanId
      };

      if (editingGoal) {
        const response = await updateGoal(editingGoal.id, goalData);
        if (response.status === 200) {
          const updatedGoals = goals.map(g =>
            g.id === editingGoal.id ? response.data : g
          );
          onGoalsUpdate(updatedGoals);
          Swal.fire({
            icon: 'success',
            title: 'Goal Updated',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } else {
        const response = await createGoal(patientId, goalData);
        if (response.status === 201) {
          onGoalsUpdate([...goals, response.data]);
          Swal.fire({
            icon: 'success',
            title: 'Goal Added',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
      handleCloseGoalModal();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save goal. Please try again.'
      });
    }
  };

  const handleDeleteGoal = async (goal: Goal) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Goal?',
      text: 'This will mark the goal as discontinued. Are you sure?',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteGoal(goal.id);
        if (response.status === 200) {
          const updatedGoals = goals.map(g =>
            g.id === goal.id ? { ...g, goal_status: 'DISCONTINUED' as const } : g
          );
          onGoalsUpdate(updatedGoals);
          Swal.fire({
            icon: 'success',
            title: 'Goal Deleted',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error deleting goal:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete goal.'
        });
      }
    }
  };

  const handleDiscontinueGoal = async (goal: Goal) => {
    const { value: reason } = await Swal.fire({
      title: 'Discontinue Goal',
      input: 'textarea',
      inputLabel: 'Reason for discontinuation',
      inputPlaceholder: 'Enter the reason...',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide a reason';
        }
      }
    });

    if (reason) {
      try {
        const response = await discontinueGoal(goal.id, reason);
        if (response.status === 200) {
          const updatedGoals = goals.map(g =>
            g.id === goal.id ? response.data : g
          );
          onGoalsUpdate(updatedGoals);
          Swal.fire({
            icon: 'success',
            title: 'Goal Discontinued',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error discontinuing goal:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to discontinue goal.'
        });
      }
    }
  };

  // ==============================|| PROGRESS HANDLERS ||============================== //

  const handleOpenProgressModal = (goal: Goal) => {
    setProgressGoal(goal);
    setProgressFormData({
      progress_level: goal.progress_level || '',
      progress_notes: '',
      barriers_to_achievement: goal.barriers_to_achievement || '',
      modifications_needed: goal.modifications_needed || ''
    });
    setProgressModalOpen(true);
  };

  const handleCloseProgressModal = () => {
    setProgressModalOpen(false);
    setProgressGoal(null);
    setProgressFormData(initialProgressForm);
  };

  const handleProgressFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setProgressFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProgress = async () => {
    if (!progressGoal) return;

    try {
      const response = await updateGoalProgress(progressGoal.id, progressFormData);
      if (response.status === 200) {
        const updatedGoals = goals.map(g =>
          g.id === progressGoal.id ? response.data : g
        );
        onGoalsUpdate(updatedGoals);
        handleCloseProgressModal();
        Swal.fire({
          icon: 'success',
          title: 'Progress Updated',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      console.error('Error updating progress:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update progress.'
      });
    }
  };

  // ==============================|| MILESTONE HANDLERS ||============================== //

  const handleOpenMilestoneModal = (goal: Goal) => {
    setMilestoneGoal(goal);
    setMilestoneFormData(initialMilestoneForm);
    setMilestoneModalOpen(true);
  };

  const handleCloseMilestoneModal = () => {
    setMilestoneModalOpen(false);
    setMilestoneGoal(null);
    setMilestoneFormData(initialMilestoneForm);
  };

  const handleMilestoneFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMilestoneFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMilestoneCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setMilestoneFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSaveMilestone = async () => {
    if (!milestoneGoal || !milestoneFormData.milestone_description.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please provide a milestone description.'
      });
      return;
    }

    try {
      const response = await addGoalMilestone(milestoneGoal.id, milestoneFormData);
      if (response.status === 200) {
        const updatedGoals = goals.map(g =>
          g.id === milestoneGoal.id ? response.data : g
        );
        onGoalsUpdate(updatedGoals);
        handleCloseMilestoneModal();
        Swal.fire({
          icon: 'success',
          title: 'Milestone Added',
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      console.error('Error adding milestone:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to add milestone.'
      });
    }
  };

  // ==============================|| RENDER ||============================== //

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<Add size={18} />}
            onClick={() => handleOpenGoalModal()}
          >
            Add Goal
          </Button>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Filter Status</InputLabel>
            <Select
              value={filterStatus}
              label="Filter Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Goals</MenuItem>
              {GOAL_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`${goals.filter(g => g.goal_status === 'NOT_STARTED' || g.goal_status === 'IN_PROGRESS').length} Active`}
            color="primary"
            size="small"
          />
          <Chip
            label={`${goals.filter(g => g.goal_status === 'ACHIEVED').length} Achieved`}
            color="success"
            size="small"
          />
        </Stack>
      </Stack>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Alert severity="info">
          {filterStatus === 'all'
            ? 'No goals have been added yet. Click "Add Goal" to create the first goal.'
            : `No goals with status "${filterStatus}" found.`}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {filteredGoals.map((goal) => {
            const relatedProblem = problems.find(p => p.id === goal.problem_id);
            const progressPercent = getProgressPercent(goal.progress_level);
            const isExpanded = expandedGoals[goal.id] || false;

            return (
              <Card key={goal.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Chip
                          label={goal.goal_status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(goal.goal_status)}
                        />
                        {goal.primary_discipline && (
                          <Chip
                            label={goal.primary_discipline}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {relatedProblem && (
                          <Tooltip title={`Related to: ${relatedProblem.problem_description}`}>
                            <Chip
                              label={relatedProblem.problem_category}
                              size="small"
                              variant="outlined"
                              color="secondary"
                            />
                          </Tooltip>
                        )}
                      </Stack>

                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                        {goal.goal_description}
                      </Typography>

                      {/* Progress Bar */}
                      {goal.goal_status !== 'NOT_STARTED' && goal.goal_status !== 'DISCONTINUED' && (
                        <Box sx={{ mb: 1 }}>
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Progress: {goal.progress_level?.replace('_', ' ') || 'Not tracked'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {progressPercent}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            color={progressPercent >= 100 ? 'success' : progressPercent > 50 ? 'primary' : 'warning'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      )}

                      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                        {goal.start_date && (
                          <Typography variant="caption" color="text.secondary">
                            Start: {new Date(goal.start_date).toLocaleDateString()}
                          </Typography>
                        )}
                        {goal.target_date && (
                          <Typography variant="caption" color="text.secondary">
                            Target: {new Date(goal.target_date).toLocaleDateString()}
                          </Typography>
                        )}
                      </Stack>

                      {/* Expandable Details */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          {goal.measurable_outcome && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Measurable Outcome:</strong> {goal.measurable_outcome}
                            </Typography>
                          )}
                          {goal.outcome_criteria && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Outcome Criteria:</strong> {goal.outcome_criteria}
                            </Typography>
                          )}
                          {goal.progress_notes && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Progress Notes:</strong> {goal.progress_notes}
                            </Typography>
                          )}
                          {goal.barriers_to_achievement && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Barriers:</strong> {goal.barriers_to_achievement}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {goal.patient_agreement && (
                              <Chip label="Patient Agreed" size="small" color="success" variant="outlined" />
                            )}
                            {goal.family_agreement && (
                              <Chip label="Family Agreed" size="small" color="success" variant="outlined" />
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </Box>

                    {/* Actions */}
                    <Stack direction="column" spacing={0.5}>
                      <Tooltip title={isExpanded ? 'Show Less' : 'Show More'}>
                        <IconButton size="small" onClick={() => toggleGoalExpanded(goal.id)}>
                          {isExpanded ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
                        </IconButton>
                      </Tooltip>
                      {goal.goal_status !== 'ACHIEVED' && goal.goal_status !== 'DISCONTINUED' && (
                        <>
                          <Tooltip title="Update Progress">
                            <IconButton size="small" onClick={() => handleOpenProgressModal(goal)} color="primary">
                              <Activity size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Milestone">
                            <IconButton size="small" onClick={() => handleOpenMilestoneModal(goal)}>
                              <Flag size={18} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenGoalModal(goal)}>
                          <Edit2 size={18} />
                        </IconButton>
                      </Tooltip>
                      {goal.goal_status !== 'ACHIEVED' && goal.goal_status !== 'DISCONTINUED' && (
                        <Tooltip title="Discontinue">
                          <IconButton size="small" onClick={() => handleDiscontinueGoal(goal)} color="warning">
                            <CloseCircle size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteGoal(goal)} color="error">
                          <Trash size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Goal Modal */}
      <Modal open={goalModalOpen} onClose={handleCloseGoalModal}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            {editingGoal ? 'Edit Goal' : 'Add Goal'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Goal Description *"
                name="goal_description"
                value={goalFormData.goal_description}
                onChange={handleGoalFormChange}
                error={!!goalFormErrors.goal_description}
                helperText={goalFormErrors.goal_description || 'Write a clear, patient-centered goal'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="goal_status"
                  value={goalFormData.goal_status}
                  label="Status"
                  onChange={handleGoalFormChange}
                >
                  {GOAL_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Related Problem</InputLabel>
                <Select
                  name="problem_id"
                  value={goalFormData.problem_id}
                  label="Related Problem"
                  onChange={handleGoalFormChange}
                >
                  <MenuItem value="">None</MenuItem>
                  {problems.filter(p => p.problem_status !== 'RESOLVED').map((problem) => (
                    <MenuItem key={problem.id} value={problem.id.toString()}>
                      {problem.problem_category}: {problem.problem_description.substring(0, 50)}...
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date *"
                name="start_date"
                type="date"
                value={goalFormData.start_date}
                onChange={handleGoalFormChange}
                InputLabelProps={{ shrink: true }}
                error={!!goalFormErrors.start_date}
                helperText={goalFormErrors.start_date}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target Date"
                name="target_date"
                type="date"
                value={goalFormData.target_date}
                onChange={handleGoalFormChange}
                InputLabelProps={{ shrink: true }}
                error={!!goalFormErrors.target_date}
                helperText={goalFormErrors.target_date}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Discipline</InputLabel>
                <Select
                  name="primary_discipline"
                  value={goalFormData.primary_discipline}
                  label="Primary Discipline"
                  onChange={handleGoalFormChange}
                >
                  {DISCIPLINES.map((disc) => (
                    <MenuItem key={disc.value} value={disc.value}>
                      {disc.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Progress Level</InputLabel>
                <Select
                  name="progress_level"
                  value={goalFormData.progress_level}
                  label="Progress Level"
                  onChange={handleGoalFormChange}
                >
                  <MenuItem value="">Not Started</MenuItem>
                  {PROGRESS_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label} ({level.percent}%)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Measurable Outcome"
                name="measurable_outcome"
                value={goalFormData.measurable_outcome}
                onChange={handleGoalFormChange}
                helperText="How will you know when the goal is achieved?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Outcome Criteria"
                name="outcome_criteria"
                value={goalFormData.outcome_criteria}
                onChange={handleGoalFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Evaluation Method"
                name="evaluation_method"
                value={goalFormData.evaluation_method}
                onChange={handleGoalFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="patient_agreement"
                      checked={goalFormData.patient_agreement}
                      onChange={handleGoalCheckboxChange}
                    />
                  }
                  label="Patient Agrees"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="family_agreement"
                      checked={goalFormData.family_agreement}
                      onChange={handleGoalCheckboxChange}
                    />
                  }
                  label="Family Agrees"
                />
              </Stack>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCloseGoalModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveGoal}>
              {editingGoal ? 'Update' : 'Add'} Goal
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Progress Update Modal */}
      <Modal open={progressModalOpen} onClose={handleCloseProgressModal}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Update Progress
          </Typography>

          {progressGoal && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Goal: {progressGoal.goal_description}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Progress Level</InputLabel>
                <Select
                  name="progress_level"
                  value={progressFormData.progress_level}
                  label="Progress Level"
                  onChange={handleProgressFormChange}
                >
                  {PROGRESS_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label} ({level.percent}%)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Progress Notes"
                name="progress_notes"
                value={progressFormData.progress_notes}
                onChange={handleProgressFormChange}
                helperText="Document what progress has been made"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Barriers to Achievement"
                name="barriers_to_achievement"
                value={progressFormData.barriers_to_achievement}
                onChange={handleProgressFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Modifications Needed"
                name="modifications_needed"
                value={progressFormData.modifications_needed}
                onChange={handleProgressFormChange}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCloseProgressModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveProgress}>
              Save Progress
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Milestone Modal */}
      <Modal open={milestoneModalOpen} onClose={handleCloseMilestoneModal}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Add Milestone
          </Typography>

          {milestoneGoal && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Goal: {milestoneGoal.goal_description}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Milestone Description *"
                name="milestone_description"
                value={milestoneFormData.milestone_description}
                onChange={handleMilestoneFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Milestone Date"
                name="milestone_date"
                type="date"
                value={milestoneFormData.milestone_date}
                onChange={handleMilestoneFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="achieved"
                    checked={milestoneFormData.achieved}
                    onChange={handleMilestoneCheckboxChange}
                  />
                }
                label="Milestone Achieved"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                name="notes"
                value={milestoneFormData.notes}
                onChange={handleMilestoneFormChange}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCloseMilestoneModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveMilestone}>
              Add Milestone
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default GoalsTab;
