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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Card,
  CardContent,
  Modal,
  SelectChangeEvent
} from '@mui/material';
import {
  ArrowDown2,
  Add,
  Edit2,
  Trash,
  TickCircle
} from 'iconsax-react';
import Swal from 'sweetalert2';

import {
  CarePlan,
  Problem,
  createProblem,
  updateProblem,
  deleteProblem,
  resolveProblem
} from '../../../api/carePlan';

// ==============================|| CONSTANTS ||============================== //

const PROBLEM_CATEGORIES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'PSYCHOLOGICAL', label: 'Psychological' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'SPIRITUAL', label: 'Spiritual' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'CAREGIVER', label: 'Caregiver' }
];

const PROBLEM_PRIORITIES = [
  { value: 'HIGH', label: 'High', color: 'error' as const },
  { value: 'MEDIUM', label: 'Medium', color: 'warning' as const },
  { value: 'LOW', label: 'Low', color: 'default' as const }
];

const PROBLEM_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'WORSENING', label: 'Worsening' },
  { value: 'IMPROVING', label: 'Improving' },
  { value: 'STABLE', label: 'Stable' }
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

const CODE_STATUSES = [
  { value: 'FULL_CODE', label: 'Full Code' },
  { value: 'DNR', label: 'DNR' },
  { value: 'DNI', label: 'DNI' },
  { value: 'DNR_DNI', label: 'DNR/DNI' },
  { value: 'COMFORT_CARE', label: 'Comfort Care Only' }
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

interface CarePlanOverviewTabProps {
  carePlan: CarePlan;
  formData: Partial<CarePlan>;
  problems: Problem[];
  onFormChange: (updates: Partial<CarePlan>) => void;
  onProblemsUpdate: (problems: Problem[]) => void;
  patientId: string;
}

interface ProblemFormData {
  problem_category: string;
  problem_description: string;
  problem_priority: string;
  problem_status: string;
  onset_date: string;
  identified_date: string;
  etiology: string;
  signs_symptoms: string;
  related_diagnoses: string;
  contributing_factors: string;
  primary_discipline: string;
  notes: string;
}

const initialProblemForm: ProblemFormData = {
  problem_category: '',
  problem_description: '',
  problem_priority: 'MEDIUM',
  problem_status: 'ACTIVE',
  onset_date: '',
  identified_date: new Date().toISOString().split('T')[0],
  etiology: '',
  signs_symptoms: '',
  related_diagnoses: '',
  contributing_factors: '',
  primary_discipline: '',
  notes: ''
};

// ==============================|| CARE PLAN OVERVIEW TAB ||============================== //

const CarePlanOverviewTab = ({
  carePlan,
  formData,
  problems,
  onFormChange,
  onProblemsUpdate,
  patientId
}: CarePlanOverviewTabProps) => {
  // State for problem modal
  const [problemModalOpen, setProblemModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [problemFormData, setProblemFormData] = useState<ProblemFormData>(initialProblemForm);
  const [problemFormErrors, setProblemFormErrors] = useState<Record<string, string>>({});

  // Accordion expansion state
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('overview');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  // ==============================|| FORM HANDLERS ||============================== //

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFormChange({ [name]: checked });
  };

  // ==============================|| PROBLEM HANDLERS ||============================== //

  const handleOpenProblemModal = (problem?: Problem) => {
    if (problem) {
      setEditingProblem(problem);
      setProblemFormData({
        problem_category: problem.problem_category || '',
        problem_description: problem.problem_description || '',
        problem_priority: problem.problem_priority || 'MEDIUM',
        problem_status: problem.problem_status || 'ACTIVE',
        onset_date: problem.onset_date || '',
        identified_date: problem.identified_date || new Date().toISOString().split('T')[0],
        etiology: problem.etiology || '',
        signs_symptoms: problem.signs_symptoms || '',
        related_diagnoses: problem.related_diagnoses || '',
        contributing_factors: problem.contributing_factors || '',
        primary_discipline: problem.primary_discipline || '',
        notes: problem.notes || ''
      });
    } else {
      setEditingProblem(null);
      setProblemFormData(initialProblemForm);
    }
    setProblemFormErrors({});
    setProblemModalOpen(true);
  };

  const handleCloseProblemModal = () => {
    setProblemModalOpen(false);
    setEditingProblem(null);
    setProblemFormData(initialProblemForm);
    setProblemFormErrors({});
  };

  const handleProblemFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setProblemFormData(prev => ({ ...prev, [name]: value }));
    if (problemFormErrors[name]) {
      setProblemFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProblemForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!problemFormData.problem_category) {
      errors.problem_category = 'Category is required';
    }
    if (!problemFormData.problem_description.trim()) {
      errors.problem_description = 'Description is required';
    }
    if (!problemFormData.identified_date) {
      errors.identified_date = 'Identified date is required';
    }

    setProblemFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProblem = async () => {
    if (!validateProblemForm()) return;

    try {
      const problemData: Partial<Problem> = {
        problem_category: problemFormData.problem_category as Problem['problem_category'],
        problem_description: problemFormData.problem_description,
        problem_priority: problemFormData.problem_priority as Problem['problem_priority'],
        problem_status: problemFormData.problem_status as Problem['problem_status'],
        onset_date: problemFormData.onset_date || undefined,
        identified_date: problemFormData.identified_date,
        etiology: problemFormData.etiology || undefined,
        signs_symptoms: problemFormData.signs_symptoms || undefined,
        related_diagnoses: problemFormData.related_diagnoses || undefined,
        contributing_factors: problemFormData.contributing_factors || undefined,
        primary_discipline: problemFormData.primary_discipline || undefined,
        notes: problemFormData.notes || undefined,
        care_plan_id: carePlan.id
      };

      if (editingProblem) {
        const response = await updateProblem(editingProblem.id, problemData);
        if (response.status === 200) {
          const updatedProblems = problems.map(p =>
            p.id === editingProblem.id ? response.data : p
          );
          onProblemsUpdate(updatedProblems);
          Swal.fire({
            icon: 'success',
            title: 'Problem Updated',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } else {
        const response = await createProblem(patientId, problemData);
        if (response.status === 201) {
          onProblemsUpdate([...problems, response.data]);
          Swal.fire({
            icon: 'success',
            title: 'Problem Added',
            timer: 1500,
            showConfirmButton: false
          });
        }
      }
      handleCloseProblemModal();
    } catch (error: any) {
      console.error('Error saving problem:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save problem. Please try again.'
      });
    }
  };

  const handleDeleteProblem = async (problem: Problem) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Problem?',
      text: 'This will mark the problem as resolved. Are you sure?',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33'
    });

    if (result.isConfirmed) {
      try {
        const response = await deleteProblem(problem.id);
        if (response.status === 200) {
          const updatedProblems = problems.filter(p => p.id !== problem.id);
          onProblemsUpdate(updatedProblems);
          Swal.fire({
            icon: 'success',
            title: 'Problem Deleted',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error deleting problem:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.message || 'Failed to delete problem.'
        });
      }
    }
  };

  const handleResolveProblem = async (problem: Problem) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Resolve Problem?',
      text: 'Mark this problem as resolved?',
      showCancelButton: true,
      confirmButtonText: 'Resolve',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await resolveProblem(problem.id);
        if (response.status === 200) {
          const updatedProblems = problems.map(p =>
            p.id === problem.id ? response.data : p
          );
          onProblemsUpdate(updatedProblems);
          Swal.fire({
            icon: 'success',
            title: 'Problem Resolved',
            timer: 1500,
            showConfirmButton: false
          });
        }
      } catch (error: any) {
        console.error('Error resolving problem:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to resolve problem.'
        });
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    const found = PROBLEM_PRIORITIES.find(p => p.value === priority);
    return found?.color || 'default';
  };

  // ==============================|| RENDER ||============================== //

  return (
    <Box>
      {/* Overview Section */}
      <Accordion
        expanded={expandedAccordion === 'overview'}
        onChange={handleAccordionChange('overview')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Care Plan Overview</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Effective Date"
                name="effective_date"
                type="date"
                value={formData.effective_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Next Review Date"
                name="next_review_date"
                type="date"
                value={formData.next_review_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Patient Goals"
                name="patient_goals"
                value={formData.patient_goals || ''}
                onChange={handleInputChange}
                helperText="Goals expressed by the patient"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Family Goals"
                name="family_goals"
                value={formData.family_goals || ''}
                onChange={handleInputChange}
                helperText="Goals expressed by the family/caregivers"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Goals of Care"
                name="goals_of_care"
                value={formData.goals_of_care || ''}
                onChange={handleInputChange}
                helperText="Overall goals of hospice care for this patient"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Problems Section */}
      <Accordion
        expanded={expandedAccordion === 'problems'}
        onChange={handleAccordionChange('problems')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', mr: 2 }}>
            <Typography variant="h6">Problems / Needs</Typography>
            <Chip
              label={`${problems.filter(p => p.problem_status === 'ACTIVE').length} Active`}
              size="small"
              color="primary"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Add size={18} />}
              onClick={() => handleOpenProblemModal()}
            >
              Add Problem
            </Button>
          </Box>

          {problems.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No problems identified yet. Click &quot;Add Problem&quot; to add the first problem.
            </Typography>
          ) : (
            <Stack spacing={2}>
              {problems.map((problem) => (
                <Card key={problem.id} variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={problem.problem_category}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={problem.problem_priority}
                            size="small"
                            color={getPriorityColor(problem.problem_priority)}
                          />
                          <Chip
                            label={problem.problem_status}
                            size="small"
                            variant={problem.problem_status === 'ACTIVE' ? 'filled' : 'outlined'}
                            color={problem.problem_status === 'RESOLVED' ? 'success' : 'default'}
                          />
                        </Stack>
                        <Typography variant="body1" sx={{ mb: 1 }}>
                          {problem.problem_description}
                        </Typography>
                        {problem.etiology && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Etiology:</strong> {problem.etiology}
                          </Typography>
                        )}
                        {problem.primary_discipline && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>Discipline:</strong> {problem.primary_discipline}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Identified: {new Date(problem.identified_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        {problem.problem_status !== 'RESOLVED' && (
                          <Tooltip title="Mark as Resolved">
                            <IconButton
                              size="small"
                              onClick={() => handleResolveProblem(problem)}
                              color="success"
                            >
                              <TickCircle size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenProblemModal(problem)}
                          >
                            <Edit2 size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteProblem(problem)}
                            color="error"
                          >
                            <Trash size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Clinical Information Section */}
      <Accordion
        expanded={expandedAccordion === 'clinical'}
        onChange={handleAccordionChange('clinical')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Clinical Information</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Terminal Diagnosis"
                name="terminal_diagnosis"
                value={formData.terminal_diagnosis || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Clinical Summary"
                name="clinical_summary"
                value={formData.clinical_summary || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Prognosis"
                name="prognosis"
                value={formData.prognosis || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Mobility Status"
                name="mobility_status"
                value={formData.mobility_status || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cognitive Status"
                name="cognitive_status"
                value={formData.cognitive_status || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Functional Status Summary"
                name="functional_status_summary"
                value={formData.functional_status_summary || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Advance Directives Section */}
      <Accordion
        expanded={expandedAccordion === 'directives'}
        onChange={handleAccordionChange('directives')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Advance Directives</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="advance_directives_on_file"
                    checked={formData.advance_directives_on_file || false}
                    onChange={handleCheckboxChange}
                  />
                }
                label="Advance Directives on File"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Code Status</InputLabel>
                <Select
                  name="code_status"
                  value={formData.code_status || ''}
                  label="Code Status"
                  onChange={handleSelectChange}
                >
                  {CODE_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="DNR Status"
                name="dnr_status"
                value={formData.dnr_status || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Care Approach Section */}
      <Accordion
        expanded={expandedAccordion === 'approach'}
        onChange={handleAccordionChange('approach')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Care Approach</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Pain Management Approach"
                name="pain_management_approach"
                value={formData.pain_management_approach || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Symptom Management Approach"
                name="symptom_management_approach"
                value={formData.symptom_management_approach || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Psychosocial Plan"
                name="psychosocial_plan"
                value={formData.psychosocial_plan || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Spiritual Plan"
                name="spiritual_plan"
                value={formData.spiritual_plan || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Cultural Considerations"
                name="cultural_considerations"
                value={formData.cultural_considerations || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Safety Section */}
      <Accordion
        expanded={expandedAccordion === 'safety'}
        onChange={handleAccordionChange('safety')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Safety Plan</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Safety Plan"
                name="safety_plan"
                value={formData.safety_plan || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Fall Prevention"
                name="fall_prevention"
                value={formData.fall_prevention || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Infection Control"
                name="infection_control"
                value={formData.infection_control || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Equipment & Supplies Section */}
      <Accordion
        expanded={expandedAccordion === 'equipment'}
        onChange={handleAccordionChange('equipment')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Equipment & Supplies</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="DME Plan"
                name="dme_plan"
                value={formData.dme_plan || ''}
                onChange={handleInputChange}
                helperText="Durable Medical Equipment plan"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Supplies Needed"
                name="supplies_needed"
                value={formData.supplies_needed || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Bereavement Section */}
      <Accordion
        expanded={expandedAccordion === 'bereavement'}
        onChange={handleAccordionChange('bereavement')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Bereavement & Volunteer Services</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Bereavement Plan"
                name="bereavement_plan"
                value={formData.bereavement_plan || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Bereavement Risk Level</InputLabel>
                <Select
                  name="bereavement_risk_level"
                  value={formData.bereavement_risk_level || ''}
                  label="Bereavement Risk Level"
                  onChange={handleSelectChange}
                >
                  <MenuItem value="LOW">Low</MenuItem>
                  <MenuItem value="MODERATE">Moderate</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Volunteer Hours Weekly"
                name="volunteer_hours_weekly"
                value={formData.volunteer_hours_weekly || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Volunteer Services"
                name="volunteer_services"
                value={formData.volunteer_services || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Special Instructions Section */}
      <Accordion
        expanded={expandedAccordion === 'special'}
        onChange={handleAccordionChange('special')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Special Instructions & Summary</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Plan Summary"
                name="plan_summary"
                value={formData.plan_summary || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Special Instructions"
                name="special_instructions"
                value={formData.special_instructions || ''}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Problem Modal */}
      <Modal
        open={problemModalOpen}
        onClose={handleCloseProblemModal}
        aria-labelledby="problem-modal-title"
      >
        <Box sx={modalStyle}>
          <Typography id="problem-modal-title" variant="h5" sx={{ mb: 3 }}>
            {editingProblem ? 'Edit Problem' : 'Add Problem'}
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!problemFormErrors.problem_category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="problem_category"
                  value={problemFormData.problem_category}
                  label="Category *"
                  onChange={handleProblemFormChange}
                >
                  {PROBLEM_CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </MenuItem>
                  ))}
                </Select>
                {problemFormErrors.problem_category && (
                  <Typography variant="caption" color="error">
                    {problemFormErrors.problem_category}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="problem_priority"
                  value={problemFormData.problem_priority}
                  label="Priority"
                  onChange={handleProblemFormChange}
                >
                  {PROBLEM_PRIORITIES.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      {priority.label}
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
                label="Problem Description *"
                name="problem_description"
                value={problemFormData.problem_description}
                onChange={handleProblemFormChange}
                error={!!problemFormErrors.problem_description}
                helperText={problemFormErrors.problem_description}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Identified Date *"
                name="identified_date"
                type="date"
                value={problemFormData.identified_date}
                onChange={handleProblemFormChange}
                InputLabelProps={{ shrink: true }}
                error={!!problemFormErrors.identified_date}
                helperText={problemFormErrors.identified_date}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Onset Date"
                name="onset_date"
                type="date"
                value={problemFormData.onset_date}
                onChange={handleProblemFormChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="problem_status"
                  value={problemFormData.problem_status}
                  label="Status"
                  onChange={handleProblemFormChange}
                >
                  {PROBLEM_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      {status.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Primary Discipline</InputLabel>
                <Select
                  name="primary_discipline"
                  value={problemFormData.primary_discipline}
                  label="Primary Discipline"
                  onChange={handleProblemFormChange}
                >
                  {DISCIPLINES.map((disc) => (
                    <MenuItem key={disc.value} value={disc.value}>
                      {disc.label}
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
                label="Etiology"
                name="etiology"
                value={problemFormData.etiology}
                onChange={handleProblemFormChange}
                helperText="What caused or contributed to this problem"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Signs & Symptoms"
                name="signs_symptoms"
                value={problemFormData.signs_symptoms}
                onChange={handleProblemFormChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notes"
                name="notes"
                value={problemFormData.notes}
                onChange={handleProblemFormChange}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={2} sx={{ mt: 3 }} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleCloseProblemModal}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveProblem}>
              {editingProblem ? 'Update' : 'Add'} Problem
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default CarePlanOverviewTab;
