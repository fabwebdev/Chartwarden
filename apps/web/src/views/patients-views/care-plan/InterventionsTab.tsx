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
  Collapse,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import {
  Add,
  Edit2,
  Trash,
  TickCircle,
  CloseCircle,
  ArrowDown2,
  ArrowUp2,
  Activity,
  Pause,
  Play
} from 'iconsax-react';
import Swal from 'sweetalert2';

import {
  Intervention,
  Goal,
  Problem,
  createIntervention,
  updateIntervention,
  deleteIntervention,
  recordInterventionPerformed,
  discontinueIntervention
} from '../../../api/carePlan';

// ==============================|| CONSTANTS ||============================== //

const INTERVENTION_STATUSES = [
  { value: 'PLANNED', label: 'Planned', color: 'default' as const },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'primary' as const },
  { value: 'COMPLETED', label: 'Completed', color: 'success' as const },
  { value: 'DISCONTINUED', label: 'Discontinued', color: 'default' as const },
  { value: 'ON_HOLD', label: 'On Hold', color: 'warning' as const }
];

const INTERVENTION_CATEGORIES = [
  { value: 'NURSING', label: 'Nursing' },
  { value: 'PHYSICIAN', label: 'Physician' },
  { value: 'SOCIAL_WORK', label: 'Social Work' },
  { value: 'SPIRITUAL', label: 'Spiritual Care' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'AIDE', label: 'Hospice Aide' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'DME', label: 'DME/Equipment' },
  { value: 'EDUCATION', label: 'Patient Education' },
  { value: 'COORDINATION', label: 'Care Coordination' }
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

const EFFECTIVENESS_RATINGS = [
  { value: 'VERY_EFFECTIVE', label: 'Very Effective' },
  { value: 'EFFECTIVE', label: 'Effective' },
  { value: 'SOMEWHAT_EFFECTIVE', label: 'Somewhat Effective' },
  { value: 'NOT_EFFECTIVE', label: 'Not Effective' }
];

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'TWICE_DAILY', label: 'Twice Daily' },
  { value: 'THREE_TIMES_WEEKLY', label: '3x Weekly' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PRN', label: 'As Needed (PRN)' },
  { value: 'ONCE', label: 'One Time' }
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

interface InterventionsTabProps {
  patientId: string;
  carePlanId: number;
  interventions: Intervention[];
  goals: Goal[];
  problems: Problem[];
  onInterventionsUpdate: (interventions: Intervention[]) => void;
}

interface InterventionFormData {
  intervention_category: string;
  intervention_description: string;
  intervention_status: string;
  frequency: string;
  duration: string;
  start_date: string;
  end_date: string;
  discipline: string;
  goal_id: string;
  problem_id: string;
  requires_order: boolean;
  order_obtained: boolean;
  rationale: string;
  expected_outcome: string;
  special_instructions: string;
  precautions: string;
  education_provided: boolean;
}

interface PerformedFormData {
  effectiveness_rating: string;
  evaluation_notes: string;
  patient_response: string;
  next_scheduled_date: string;
}

const initialInterventionForm: InterventionFormData = {
  intervention_category: '',
  intervention_description: '',
  intervention_status: 'PLANNED',
  frequency: '',
  duration: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  discipline: '',
  goal_id: '',
  problem_id: '',
  requires_order: false,
  order_obtained: false,
  rationale: '',
  expected_outcome: '',
  special_instructions: '',
  precautions: '',
  education_provided: false
};

const initialPerformedForm: PerformedFormData = {
  effectiveness_rating: '',
  evaluation_notes: '',
  patient_response: '',
  next_scheduled_date: ''
};

// ==============================|| INTERVENTIONS TAB ||============================== //

const InterventionsTab = ({
  patientId,
  carePlanId,
  interventions,
  goals,
  problems,
  onInterventionsUpdate
}: InterventionsTabProps) => {
  // State for intervention modal
  const [interventionModalOpen, setInterventionModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [interventionFormData, setInterventionFormData] = useState<InterventionFormData>(initialInterventionForm);
  const [interventionFormErrors, setInterventionFormErrors] = useState<Record<string, string>>({});

  // State for performed modal
  const [performedModalOpen, setPerformedModalOpen] = useState(false);
  const [performedIntervention, setPerformedIntervention] = useState<Intervention | null>(null);
  const [performedFormData, setPerformedFormData] = useState<PerformedFormData>(initialPerformedForm);

  // State for expanded intervention cards
  const [expandedInterventions, setExpandedInterventions] = useState<Record<number, boolean>>({});

  // Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // ==============================|| HELPERS ||============================== //

  const getStatusColor = (status: string) => {
    const found = INTERVENTION_STATUSES.find(s => s.value === status);
    return found?.color || 'default';
  };

  const toggleInterventionExpanded = (interventionId: number) => {
    setExpandedInterventions(prev => ({
      ...prev,
      [interventionId]: !prev[interventionId]
    }));
  };

  const filteredInterventions = interventions
    .filter(i => filterStatus === 'all' || i.intervention_status === filterStatus)
    .filter(i => filterCategory === 'all' || i.intervention_category === filterCategory);

  // ==============================|| INTERVENTION HANDLERS ||============================== //

  const handleOpenInterventionModal = (intervention?: Intervention) => {
    if (intervention) {
      setEditingIntervention(intervention);
      setInterventionFormData({
        intervention_category: intervention.intervention_category || '',
        intervention_description: intervention.intervention_description || '',
        intervention_status: intervention.intervention_status || 'PLANNED',
        frequency: intervention.frequency || '',
        duration: intervention.duration || '',
        start_date: intervention.start_date || new Date().toISOString().split('T')[0],
        end_date: intervention.end_date || '',
        discipline: intervention.discipline || '',
        goal_id: intervention.goal_id?.toString() || '',
        problem_id: intervention.problem_id?.toString() || '',
        requires_order: intervention.requires_order || false,
        order_obtained: intervention.order_obtained || false,
        rationale: intervention.rationale || '',
        expected_outcome: intervention.expected_outcome || '',
        special_instructions: intervention.special_instructions || '',
        precautions: intervention.precautions || '',
        education_provided: intervention.education_provided || false
      });
    } else {
      setEditingIntervention(null);
      setInterventionFormData(initialInterventionForm);
    }
    setInterventionFormErrors({});
    setInterventionModalOpen(true);
  };

  const handleCloseInterventionModal = () => {
    setInterventionModalOpen(false);
    setEditingIntervention(null);
    setInterventionFormData(initialInterventionForm);
    setInterventionFormErrors({});
  };

  const handleInterventionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setInterventionFormData(prev => ({ ...prev, [name]: value }));
    if (interventionFormErrors[name]) {
      setInterventionFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleInterventionCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setInterventionFormData(prev => ({ ...prev, [name]: checked }));
  };

  const validateInterventionForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!interventionFormData.intervention_category) {
      errors.intervention_category = 'Category is required';
    }
    if (!interventionFormData.intervention_description.trim()) {
      errors.intervention_description = 'Description is required';
    }
    if (!interventionFormData.discipline) {
      errors.discipline = 'Discipline is required';
    }
    if (interventionFormData.end_date && interventionFormData.start_date && interventionFormData.end_date < interventionFormData.start_date) {
      errors.end_date = 'End date must be after start date';
    }

    setInterventionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveIntervention = async () => {
    if (!validateInterventionForm()) return;

    try {
      const interventionData: Partial<Intervention> = {
        intervention_category: interventionFormData.intervention_category as Intervention['intervention_category'],
        intervention_description: interventionFormData.intervention_description,
        intervention_status: interventionFormData.intervention_status as Intervention['intervention_status'],
        frequency: interventionFormData.frequency || undefined,
        duration: interventionFormData.duration || undefined,
        start_date: interventionFormData.start_date || undefined,
        end_date: interventionFormData.end_date || undefined,
        discipline: interventionFormData.discipline,
        goal_id: interventionFormData.goal_id ? parseInt(interventionFormData.goal_id) : undefined,
        problem_id: interventionFormData.problem_id ? parseInt(interventionFormData.problem_id) : undefined,
        requires_order: interventionFormData.requires_order,
        order_obtained: interventionFormData.order_obtained,
        rationale: interventionFormData.rationale || undefined,
        expected_outcome: interventionFormData.expected_outcome || undefined,
        special_instructions: interventionFormData.special_instructions || undefined,
        precautions: interventionFormData.precautions || undefined,
        education_provided: interventionFormData.education_provided,
        care_plan_id: carePlanId
      };

      if (editingIntervention) {
        const response = await updateIntervention(editingIntervention.id, interventionData);
        if (response.status === 200) {
          const updatedInterventions = interventions.map(i =>
            i.id === editingIntervention.id ? response.data : i
          );
          onInterventionsUpdate(updatedInterventions);
          Swal.fire({
            icon: 'success',
            title: 'Intervention Updated',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } else {
        const response = await createIntervention(patientId, interventionData);
        if (response.status === 201) {
          onInterventionsUpdate([...interventions, response.data]);
          Swal.fire({
            icon: 'success',
            title: 'Intervention Added',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
      handleCloseInterventionModal();
    } catch (error: any) {
      console.error('Error saving intervention:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save intervention. Please try again.'
      });
    }
  };

  const handleDeleteIntervention = async (intervention: Intervention) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Intervention?',
      text: 'This will mark the intervention as discontinued. Are you sure?',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteIntervention(intervention.id);
        if (response.status === 200) {
          const updatedInterventions = interventions.map(i =>
            i.id === intervention.id ? { ...i, intervention_status: 'DISCONTINUED' as const } : i
          );
          onInterventionsUpdate(updatedInterventions);
          Swal.fire({
            icon: 'success',
            title: 'Intervention Deleted',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error deleting intervention:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete intervention.'
        });
      }
    }
  };

  const handleDiscontinueIntervention = async (intervention: Intervention) => {
    const { value: reason } = await Swal.fire({
      title: 'Discontinue Intervention',
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
        const response = await discontinueIntervention(intervention.id, reason);
        if (response.status === 200) {
          const updatedInterventions = interventions.map(i =>
            i.id === intervention.id ? response.data : i
          );
          onInterventionsUpdate(updatedInterventions);
          Swal.fire({
            icon: 'success',
            title: 'Intervention Discontinued',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error discontinuing intervention:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to discontinue intervention.'
        });
      }
    }
  };

  const handleToggleOnHold = async (intervention: Intervention) => {
    const newStatus = intervention.intervention_status === 'ON_HOLD' ? 'IN_PROGRESS' : 'ON_HOLD';
    try {
      const response = await updateIntervention(intervention.id, { intervention_status: newStatus });
      if (response.status === 200) {
        const updatedInterventions = interventions.map(i =>
          i.id === intervention.id ? response.data : i
        );
        onInterventionsUpdate(updatedInterventions);
      }
    } catch (error: any) {
      console.error('Error updating intervention status:', error);
    }
  };

  // ==============================|| PERFORMED HANDLERS ||============================== //

  const handleOpenPerformedModal = (intervention: Intervention) => {
    setPerformedIntervention(intervention);
    setPerformedFormData({
      effectiveness_rating: intervention.effectiveness_rating || '',
      evaluation_notes: '',
      patient_response: '',
      next_scheduled_date: ''
    });
    setPerformedModalOpen(true);
  };

  const handleClosePerformedModal = () => {
    setPerformedModalOpen(false);
    setPerformedIntervention(null);
    setPerformedFormData(initialPerformedForm);
  };

  const handlePerformedFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setPerformedFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSavePerformed = async () => {
    if (!performedIntervention) return;

    try {
      const response = await recordInterventionPerformed(performedIntervention.id, performedFormData);
      if (response.status === 200) {
        const updatedInterventions = interventions.map(i =>
          i.id === performedIntervention.id ? response.data : i
        );
        onInterventionsUpdate(updatedInterventions);
        handleClosePerformedModal();
        Swal.fire({
          icon: 'success',
          title: 'Recorded',
          text: `Intervention performed ${response.data.times_performed} time(s)`,
          timer: 1500,
          showConfirmButton: false
        });
      }
    } catch (error: any) {
      console.error('Error recording intervention:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to record intervention.'
      });
    }
  };

  // ==============================|| RENDER ||============================== //

  return (
    <Box>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            startIcon={<Add size={18} />}
            onClick={() => handleOpenInterventionModal()}
          >
            Add Intervention
          </Button>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              {INTERVENTION_STATUSES.map((status) => (
                <MenuItem key={status.value} value={status.value}>
                  {status.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filterCategory}
              label="Category"
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {INTERVENTION_CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  {cat.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Chip
            label={`${interventions.filter(i => i.intervention_status === 'PLANNED' || i.intervention_status === 'IN_PROGRESS').length} Active`}
            color="primary"
            size="small"
          />
          <Chip
            label={`${interventions.filter(i => i.intervention_status === 'COMPLETED').length} Completed`}
            color="success"
            size="small"
          />
        </Stack>
      </Stack>

      {/* Interventions List */}
      {filteredInterventions.length === 0 ? (
        <Alert severity="info">
          {filterStatus === 'all' && filterCategory === 'all'
            ? 'No interventions have been added yet. Click "Add Intervention" to create the first intervention.'
            : 'No interventions match the selected filters.'}
        </Alert>
      ) : (
        <Stack spacing={2}>
          {filteredInterventions.map((intervention) => {
            const relatedGoal = goals.find(g => g.id === intervention.goal_id);
            const relatedProblem = problems.find(p => p.id === intervention.problem_id);
            const isExpanded = expandedInterventions[intervention.id] || false;
            const isActive = intervention.intervention_status === 'PLANNED' || intervention.intervention_status === 'IN_PROGRESS';

            return (
              <Card key={intervention.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ flex: 1, mr: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                        <Chip
                          label={intervention.intervention_status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(intervention.intervention_status)}
                        />
                        <Chip
                          label={intervention.intervention_category.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={intervention.discipline}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                        {intervention.frequency && (
                          <Chip
                            label={intervention.frequency}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>

                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                        {intervention.intervention_description}
                      </Typography>

                      {/* Related Items */}
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                        {relatedGoal && (
                          <Tooltip title={`Goal: ${relatedGoal.goal_description}`}>
                            <Chip
                              label={`Goal: ${relatedGoal.goal_description.substring(0, 30)}...`}
                              size="small"
                              variant="outlined"
                              color="primary"
                              icon={<Activity size={14} />}
                            />
                          </Tooltip>
                        )}
                        {relatedProblem && (
                          <Tooltip title={`Problem: ${relatedProblem.problem_description}`}>
                            <Chip
                              label={relatedProblem.problem_category}
                              size="small"
                              variant="outlined"
                              color="warning"
                            />
                          </Tooltip>
                        )}
                      </Stack>

                      {/* Tracking Info */}
                      <Stack direction="row" spacing={2}>
                        {intervention.start_date && (
                          <Typography variant="caption" color="text.secondary">
                            Start: {new Date(intervention.start_date).toLocaleDateString()}
                          </Typography>
                        )}
                        {intervention.times_performed !== undefined && intervention.times_performed > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Performed: {intervention.times_performed}x
                          </Typography>
                        )}
                        {intervention.last_performed_date && (
                          <Typography variant="caption" color="text.secondary">
                            Last: {new Date(intervention.last_performed_date).toLocaleDateString()}
                          </Typography>
                        )}
                        {intervention.effectiveness_rating && (
                          <Chip
                            label={intervention.effectiveness_rating.replace('_', ' ')}
                            size="small"
                            color={intervention.effectiveness_rating === 'VERY_EFFECTIVE' || intervention.effectiveness_rating === 'EFFECTIVE' ? 'success' : 'warning'}
                          />
                        )}
                      </Stack>

                      {/* Expandable Details */}
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          {intervention.rationale && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Rationale:</strong> {intervention.rationale}
                            </Typography>
                          )}
                          {intervention.expected_outcome && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Expected Outcome:</strong> {intervention.expected_outcome}
                            </Typography>
                          )}
                          {intervention.patient_response && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Patient Response:</strong> {intervention.patient_response}
                            </Typography>
                          )}
                          {intervention.special_instructions && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Special Instructions:</strong> {intervention.special_instructions}
                            </Typography>
                          )}
                          {intervention.precautions && (
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              <strong>Precautions:</strong> {intervention.precautions}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {intervention.requires_order && (
                              <Chip
                                label={intervention.order_obtained ? 'Order Obtained' : 'Order Required'}
                                size="small"
                                color={intervention.order_obtained ? 'success' : 'warning'}
                                variant="outlined"
                              />
                            )}
                            {intervention.education_provided && (
                              <Chip label="Education Provided" size="small" color="info" variant="outlined" />
                            )}
                          </Stack>
                        </Box>
                      </Collapse>
                    </Box>

                    {/* Actions */}
                    <Stack direction="column" spacing={0.5}>
                      <Tooltip title={isExpanded ? 'Show Less' : 'Show More'}>
                        <IconButton size="small" onClick={() => toggleInterventionExpanded(intervention.id)}>
                          {isExpanded ? <ArrowUp2 size={18} /> : <ArrowDown2 size={18} />}
                        </IconButton>
                      </Tooltip>
                      {isActive && (
                        <>
                          <Tooltip title="Record Performed">
                            <IconButton size="small" onClick={() => handleOpenPerformedModal(intervention)} color="success">
                              <TickCircle size={18} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={intervention.intervention_status === 'ON_HOLD' ? 'Resume' : 'Put On Hold'}>
                            <IconButton size="small" onClick={() => handleToggleOnHold(intervention)} color="warning">
                              {intervention.intervention_status === 'ON_HOLD' ? <Play size={18} /> : <Pause size={18} />}
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenInterventionModal(intervention)}>
                          <Edit2 size={18} />
                        </IconButton>
                      </Tooltip>
                      {isActive && (
                        <Tooltip title="Discontinue">
                          <IconButton size="small" onClick={() => handleDiscontinueIntervention(intervention)} color="warning">
                            <CloseCircle size={18} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDeleteIntervention(intervention)} color="error">
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

      {/* Intervention Modal */}
      <Modal open={interventionModalOpen} onClose={handleCloseInterventionModal}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            {editingIntervention ? 'Edit Intervention' : 'Add Intervention'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!interventionFormErrors.intervention_category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="intervention_category"
                  value={interventionFormData.intervention_category}
                  label="Category *"
                  onChange={handleInterventionFormChange}
                >
                  {INTERVENTION_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
                {interventionFormErrors.intervention_category && (
                  <Typography variant="caption" color="error">
                    {interventionFormErrors.intervention_category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!interventionFormErrors.discipline}>
                <InputLabel>Discipline *</InputLabel>
                <Select
                  name="discipline"
                  value={interventionFormData.discipline}
                  label="Discipline *"
                  onChange={handleInterventionFormChange}
                >
                  {DISCIPLINES.map((disc) => (
                    <MenuItem key={disc.value} value={disc.value}>
                      {disc.label}
                    </MenuItem>
                  ))}
                </Select>
                {interventionFormErrors.discipline && (
                  <Typography variant="caption" color="error">
                    {interventionFormErrors.discipline}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Intervention Description *"
                name="intervention_description"
                value={interventionFormData.intervention_description}
                onChange={handleInterventionFormChange}
                error={!!interventionFormErrors.intervention_description}
                helperText={interventionFormErrors.intervention_description}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="intervention_status"
                  value={interventionFormData.intervention_status}
                  label="Status"
                  onChange={handleInterventionFormChange}
                >
                  {INTERVENTION_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  name="frequency"
                  value={interventionFormData.frequency}
                  label="Frequency"
                  onChange={handleInterventionFormChange}
                >
                  <MenuItem value="">Not specified</MenuItem>
                  {FREQUENCIES.map((freq) => (
                    <MenuItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Duration"
                name="duration"
                value={interventionFormData.duration}
                onChange={handleInterventionFormChange}
                placeholder="e.g., 30 minutes, ongoing"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Related Goal</InputLabel>
                <Select
                  name="goal_id"
                  value={interventionFormData.goal_id}
                  label="Related Goal"
                  onChange={handleInterventionFormChange}
                >
                  <MenuItem value="">None</MenuItem>
                  {goals.filter(g => g.goal_status !== 'ACHIEVED' && g.goal_status !== 'DISCONTINUED').map((goal) => (
                    <MenuItem key={goal.id} value={goal.id.toString()}>
                      {goal.goal_description.substring(0, 50)}...
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Start Date"
                name="start_date"
                type="date"
                value={interventionFormData.start_date}
                onChange={handleInterventionFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="End Date"
                name="end_date"
                type="date"
                value={interventionFormData.end_date}
                onChange={handleInterventionFormChange}
                InputLabelProps={{ shrink: true }}
                error={!!interventionFormErrors.end_date}
                helperText={interventionFormErrors.end_date}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Rationale"
                name="rationale"
                value={interventionFormData.rationale}
                onChange={handleInterventionFormChange}
                helperText="Why is this intervention needed?"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Expected Outcome"
                name="expected_outcome"
                value={interventionFormData.expected_outcome}
                onChange={handleInterventionFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Special Instructions"
                name="special_instructions"
                value={interventionFormData.special_instructions}
                onChange={handleInterventionFormChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Precautions"
                name="precautions"
                value={interventionFormData.precautions}
                onChange={handleInterventionFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="requires_order"
                      checked={interventionFormData.requires_order}
                      onChange={handleInterventionCheckboxChange}
                    />
                  }
                  label="Requires Order"
                />
                {interventionFormData.requires_order && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="order_obtained"
                        checked={interventionFormData.order_obtained}
                        onChange={handleInterventionCheckboxChange}
                      />
                    }
                    label="Order Obtained"
                  />
                )}
                <FormControlLabel
                  control={
                    <Checkbox
                      name="education_provided"
                      checked={interventionFormData.education_provided}
                      onChange={handleInterventionCheckboxChange}
                    />
                  }
                  label="Education Provided"
                />
              </Stack>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCloseInterventionModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveIntervention}>
              {editingIntervention ? 'Update' : 'Add'} Intervention
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Record Performed Modal */}
      <Modal open={performedModalOpen} onClose={handleClosePerformedModal}>
        <Box sx={modalStyle}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Record Intervention Performed
          </Typography>

          {performedIntervention && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {performedIntervention.intervention_description}
              <br />
              <Typography variant="caption">
                Previously performed: {performedIntervention.times_performed || 0} time(s)
              </Typography>
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Effectiveness Rating</InputLabel>
                <Select
                  name="effectiveness_rating"
                  value={performedFormData.effectiveness_rating}
                  label="Effectiveness Rating"
                  onChange={handlePerformedFormChange}
                >
                  <MenuItem value="">Not rated</MenuItem>
                  {EFFECTIVENESS_RATINGS.map((rating) => (
                    <MenuItem key={rating.value} value={rating.value}>
                      {rating.label}
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
                label="Patient Response"
                name="patient_response"
                value={performedFormData.patient_response}
                onChange={handlePerformedFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Evaluation Notes"
                name="evaluation_notes"
                value={performedFormData.evaluation_notes}
                onChange={handlePerformedFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Next Scheduled Date"
                name="next_scheduled_date"
                type="date"
                value={performedFormData.next_scheduled_date}
                onChange={handlePerformedFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleClosePerformedModal}>
              Cancel
            </Button>
            <Button variant="contained" color="success" onClick={handleSavePerformed}>
              Record Performed
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default InterventionsTab;
