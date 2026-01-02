'use client';

import { useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Chip,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2, Warning2 } from 'iconsax-react';
import { HOPEAssessmentFormData } from '../../../../api/hopeAssessment';

// ==============================|| CONSTANTS ||============================== //

const PAIN_PRESENCE = [
  { value: '0', label: '0 - No pain' },
  { value: '1', label: '1 - Pain present' },
  { value: '9', label: '9 - Unable to assess' }
];

const PAIN_FREQUENCY = [
  { value: '0', label: '0 - No pain' },
  { value: '1', label: '1 - Less than daily' },
  { value: '2', label: '2 - Daily' },
  { value: '3', label: '3 - Constant/continuous' }
];

const PAIN_EFFECTIVENESS = [
  { value: '0', label: '0 - Not effective' },
  { value: '1', label: '1 - Partially effective' },
  { value: '2', label: '2 - Mostly effective' },
  { value: '3', label: '3 - Fully effective' }
];

const SEVERITY_LEVELS = [
  { value: 'NONE', label: 'None' },
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' }
];

const APPETITE_STATUS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'NONE', label: 'None/Minimal' }
];

const WEIGHT_CHANGE = [
  { value: 'STABLE', label: 'Stable' },
  { value: 'GAINING', label: 'Gaining' },
  { value: 'LOSING', label: 'Losing' }
];

const COGNITIVE_STATUS = [
  { value: 'INTACT', label: 'Intact (BIMS 13-15)' },
  { value: 'BORDERLINE_INTACT', label: 'Borderline Intact (BIMS 8-12)' },
  { value: 'MODERATELY_IMPAIRED', label: 'Moderately Impaired (BIMS 3-7)' },
  { value: 'SEVERELY_IMPAIRED', label: 'Severely Impaired (BIMS 0-2)' }
];

const ADL_SCORES = [
  { value: 0, label: '0 - Independent' },
  { value: 1, label: '1 - Supervision' },
  { value: 2, label: '2 - Limited assistance' },
  { value: 3, label: '3 - Extensive assistance' },
  { value: 4, label: '4 - Total dependence' }
];

const OXYGEN_METHODS = [
  { value: 'NASAL_CANNULA', label: 'Nasal Cannula' },
  { value: 'SIMPLE_MASK', label: 'Simple Mask' },
  { value: 'NON_REBREATHER', label: 'Non-rebreather Mask' },
  { value: 'HIGH_FLOW', label: 'High Flow' },
  { value: 'CPAP_BIPAP', label: 'CPAP/BiPAP' }
];

// ==============================|| INTERFACES ||============================== //

interface SectionJProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
}

// ==============================|| SECTION J COMPONENT ||============================== //

const SectionJ_HealthConditions = ({
  formData,
  onFormChange,
  isEditable
}: SectionJProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('pain');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  const handleSelectChange = (e: SelectChangeEvent<string | number>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFormChange({ [name]: checked });
  };

  const handleSliderChange = (name: string) => (event: Event, value: number | number[]) => {
    onFormChange({ [name]: value as number });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value ? parseInt(value) : undefined });
  };

  // Check for SFV triggers (moderate/severe symptoms)
  const hasSFVTrigger =
    (formData.j0100_pain_severity_current && formData.j0100_pain_severity_current >= 7) ||
    formData.j0500_dyspnea_severity === 'SEVERE' ||
    formData.j0600_nausea_severity === 'SEVERE' ||
    formData.j1000_anxiety_severity === 'SEVERE';

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section J: Health Conditions
      </Typography>

      {hasSFVTrigger && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning2 size={20} />}>
          <Typography variant="subtitle2">SFV Trigger Detected</Typography>
          <Typography variant="body2">
            Moderate/severe symptoms detected. A Symptom Follow-up Visit (SFV) may be required within 48 hours.
          </Typography>
        </Alert>
      )}

      {/* Pain Assessment */}
      <Accordion
        expanded={expandedAccordion === 'pain'}
        onChange={handleAccordionChange('pain')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">J0100-J0300: Pain Assessment</Typography>
            {formData.j0100_pain_severity_current !== undefined && (
              <Chip
                label={`Pain: ${formData.j0100_pain_severity_current}/10`}
                size="small"
                color={formData.j0100_pain_severity_current >= 7 ? 'error' : formData.j0100_pain_severity_current >= 4 ? 'warning' : 'success'}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>J0100: Pain Presence</InputLabel>
                <Select
                  name="j0100_pain_presence"
                  value={formData.j0100_pain_presence || ''}
                  label="J0100: Pain Presence"
                  onChange={handleSelectChange}
                >
                  {PAIN_PRESENCE.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Pain Frequency</InputLabel>
                <Select
                  name="j0100_pain_frequency"
                  value={formData.j0100_pain_frequency || ''}
                  label="Pain Frequency"
                  onChange={handleSelectChange}
                >
                  {PAIN_FREQUENCY.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Current Pain Level (0-10)
              </Typography>
              <Slider
                name="j0100_pain_severity_current"
                value={formData.j0100_pain_severity_current || 0}
                onChange={handleSliderChange('j0100_pain_severity_current')}
                disabled={!isEditable}
                min={0}
                max={10}
                marks
                valueLabelDisplay="on"
                color={
                  (formData.j0100_pain_severity_current || 0) >= 7 ? 'error' :
                  (formData.j0100_pain_severity_current || 0) >= 4 ? 'warning' : 'primary'
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Worst Pain in Last 24 Hours (0-10)
              </Typography>
              <Slider
                name="j0100_pain_severity_worst"
                value={formData.j0100_pain_severity_worst || 0}
                onChange={handleSliderChange('j0100_pain_severity_worst')}
                disabled={!isEditable}
                min={0}
                max={10}
                marks
                valueLabelDisplay="on"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" gutterBottom>
                Pain Interference with Activities (0-10)
              </Typography>
              <Slider
                name="j0100_pain_interference"
                value={formData.j0100_pain_interference || 0}
                onChange={handleSliderChange('j0100_pain_interference')}
                disabled={!isEditable}
                min={0}
                max={10}
                marks
                valueLabelDisplay="on"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Acceptable Pain Level"
                name="j0100_pain_acceptable_level"
                value={formData.j0100_pain_acceptable_level || ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 10 }}
                helperText="Patient's acceptable pain level (0-10)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>J0300: Medication Effectiveness</InputLabel>
                <Select
                  name="j0300_pain_med_effectiveness"
                  value={formData.j0300_pain_med_effectiveness || ''}
                  label="J0300: Medication Effectiveness"
                  onChange={handleSelectChange}
                >
                  {PAIN_EFFECTIVENESS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Dyspnea */}
      <Accordion
        expanded={expandedAccordion === 'dyspnea'}
        onChange={handleAccordionChange('dyspnea')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">J0500: Shortness of Breath (Dyspnea)</Typography>
            {formData.j0500_dyspnea_presence && (
              <Chip label="Present" size="small" color="warning" />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0500_dyspnea_presence"
                    checked={formData.j0500_dyspnea_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Dyspnea present"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable || !formData.j0500_dyspnea_presence}>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="j0500_dyspnea_severity"
                  value={formData.j0500_dyspnea_severity || ''}
                  label="Severity"
                  onChange={handleSelectChange}
                >
                  {SEVERITY_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0500_dyspnea_at_rest"
                    checked={formData.j0500_dyspnea_at_rest || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Dyspnea at rest"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0500_dyspnea_with_activity"
                    checked={formData.j0500_dyspnea_with_activity || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Dyspnea with activity"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Nausea/Vomiting */}
      <Accordion
        expanded={expandedAccordion === 'nausea'}
        onChange={handleAccordionChange('nausea')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J0600: Nausea/Vomiting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0600_nausea_presence"
                    checked={formData.j0600_nausea_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Nausea present"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable || !formData.j0600_nausea_presence}>
                <InputLabel>Nausea Severity</InputLabel>
                <Select
                  name="j0600_nausea_severity"
                  value={formData.j0600_nausea_severity || ''}
                  label="Nausea Severity"
                  onChange={handleSelectChange}
                >
                  {SEVERITY_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0600_vomiting_presence"
                    checked={formData.j0600_vomiting_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Vomiting present"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Constipation */}
      <Accordion
        expanded={expandedAccordion === 'constipation'}
        onChange={handleAccordionChange('constipation')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J0700: Constipation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0700_constipation_presence"
                    checked={formData.j0700_constipation_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Constipation present"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable || !formData.j0700_constipation_presence}>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="j0700_constipation_severity"
                  value={formData.j0700_constipation_severity || ''}
                  label="Severity"
                  onChange={handleSelectChange}
                >
                  {SEVERITY_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0700_bowel_program"
                    checked={formData.j0700_bowel_program || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Bowel program in place"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Last Bowel Movement"
                name="j0700_last_bowel_movement"
                type="date"
                value={formData.j0700_last_bowel_movement || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Fatigue */}
      <Accordion
        expanded={expandedAccordion === 'fatigue'}
        onChange={handleAccordionChange('fatigue')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J0800: Fatigue/Weakness</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j0800_fatigue_presence"
                    checked={formData.j0800_fatigue_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Fatigue present"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable || !formData.j0800_fatigue_presence}>
                <InputLabel>Severity</InputLabel>
                <Select
                  name="j0800_fatigue_severity"
                  value={formData.j0800_fatigue_severity || ''}
                  label="Severity"
                  onChange={handleSelectChange}
                >
                  {SEVERITY_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" gutterBottom>
                Fatigue Interference (0-10)
              </Typography>
              <Slider
                name="j0800_fatigue_interference"
                value={formData.j0800_fatigue_interference || 0}
                onChange={handleSliderChange('j0800_fatigue_interference')}
                disabled={!isEditable}
                min={0}
                max={10}
                marks
                valueLabelDisplay="on"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Appetite/Nutrition */}
      <Accordion
        expanded={expandedAccordion === 'appetite'}
        onChange={handleAccordionChange('appetite')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J0900: Appetite/Nutrition</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Appetite Status</InputLabel>
                <Select
                  name="j0900_appetite_status"
                  value={formData.j0900_appetite_status || ''}
                  label="Appetite Status"
                  onChange={handleSelectChange}
                >
                  {APPETITE_STATUS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Weight Change</InputLabel>
                <Select
                  name="j0900_weight_change"
                  value={formData.j0900_weight_change || ''}
                  label="Weight Change"
                  onChange={handleSelectChange}
                >
                  {WEIGHT_CHANGE.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Nutritional Concerns"
                name="j0900_nutritional_concerns"
                value={formData.j0900_nutritional_concerns || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Anxiety/Depression (PHQ-2) */}
      <Accordion
        expanded={expandedAccordion === 'mood'}
        onChange={handleAccordionChange('mood')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">J1000: Anxiety/Depression (PHQ-2)</Typography>
            {formData.j1000_phq2_total_score !== undefined && (
              <Chip
                label={`PHQ-2: ${formData.j1000_phq2_total_score}/6`}
                size="small"
                color={formData.j1000_phq2_total_score >= 3 ? 'warning' : 'success'}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Little interest or pleasure (0-3)"
                name="j1000_phq2_little_interest"
                value={formData.j1000_phq2_little_interest ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 3 }}
                helperText="0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Feeling down, depressed (0-3)"
                name="j1000_phq2_feeling_down"
                value={formData.j1000_phq2_feeling_down ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 3 }}
                helperText="0=Not at all, 1=Several days, 2=More than half, 3=Nearly every day"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="PHQ-2 Total Score"
                name="j1000_phq2_total_score"
                value={formData.j1000_phq2_total_score ?? ''}
                InputProps={{ readOnly: true }}
                helperText="Score >= 3 suggests further assessment needed"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1000_anxiety_presence"
                    checked={formData.j1000_anxiety_presence || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Anxiety present"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable || !formData.j1000_anxiety_presence}>
                <InputLabel>Anxiety Severity</InputLabel>
                <Select
                  name="j1000_anxiety_severity"
                  value={formData.j1000_anxiety_severity || ''}
                  label="Anxiety Severity"
                  onChange={handleSelectChange}
                >
                  {SEVERITY_LEVELS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Cognitive Status (BIMS) */}
      <Accordion
        expanded={expandedAccordion === 'cognitive'}
        onChange={handleAccordionChange('cognitive')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">J1100: Cognitive Status (BIMS)</Typography>
            {formData.j1100_bims_total_score !== undefined && (
              <Chip
                label={`BIMS: ${formData.j1100_bims_total_score}/15`}
                size="small"
                color={formData.j1100_bims_total_score >= 13 ? 'success' : formData.j1100_bims_total_score >= 8 ? 'warning' : 'error'}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Repetition Score (0-2)"
                name="j1100_bims_repetition_score"
                value={formData.j1100_bims_repetition_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 2 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Year Score (0-1)"
                name="j1100_bims_year_score"
                value={formData.j1100_bims_year_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Month Score (0-1)"
                name="j1100_bims_month_score"
                value={formData.j1100_bims_month_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Day Score (0-1)"
                name="j1100_bims_day_score"
                value={formData.j1100_bims_day_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Recall Score (0-6)"
                name="j1100_bims_recall_score"
                value={formData.j1100_bims_recall_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 6 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="BIMS Total Score (0-15)"
                name="j1100_bims_total_score"
                value={formData.j1100_bims_total_score ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 15 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Cognitive Status</InputLabel>
                <Select
                  name="j1100_cognitive_status"
                  value={formData.j1100_cognitive_status || ''}
                  label="Cognitive Status"
                  onChange={handleSelectChange}
                >
                  {COGNITIVE_STATUS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Behavioral Symptoms */}
      <Accordion
        expanded={expandedAccordion === 'behavioral'}
        onChange={handleAccordionChange('behavioral')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J1200: Behavioral Symptoms</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1200_wandering"
                    checked={formData.j1200_wandering || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Wandering"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1200_verbal_behaviors"
                    checked={formData.j1200_verbal_behaviors || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Verbal behaviors"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1200_physical_behaviors"
                    checked={formData.j1200_physical_behaviors || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Physical behaviors"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1200_socially_inappropriate"
                    checked={formData.j1200_socially_inappropriate || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Socially inappropriate"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1200_resists_care"
                    checked={formData.j1200_resists_care || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Resists care"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Functional Status (ADLs) */}
      <Accordion
        expanded={expandedAccordion === 'adl'}
        onChange={handleAccordionChange('adl')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J1300: Functional Status (ADLs)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {[
              { name: 'j1300_adl_bed_mobility', label: 'Bed Mobility' },
              { name: 'j1300_adl_transfer', label: 'Transfer' },
              { name: 'j1300_adl_locomotion', label: 'Locomotion' },
              { name: 'j1300_adl_dressing', label: 'Dressing' },
              { name: 'j1300_adl_eating', label: 'Eating' },
              { name: 'j1300_adl_toileting', label: 'Toileting' },
              { name: 'j1300_adl_personal_hygiene', label: 'Personal Hygiene' },
              { name: 'j1300_adl_bathing', label: 'Bathing' }
            ].map((adl) => (
              <Grid item xs={12} md={3} key={adl.name}>
                <FormControl fullWidth disabled={!isEditable} size="small">
                  <InputLabel>{adl.label}</InputLabel>
                  <Select
                    name={adl.name}
                    value={(formData as any)[adl.name] ?? ''}
                    label={adl.label}
                    onChange={handleSelectChange}
                  >
                    {ADL_SCORES.map((score) => (
                      <MenuItem key={score.value} value={score.value}>{score.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            ))}
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1300_fall_risk"
                    checked={formData.j1300_fall_risk || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Fall risk identified"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Vital Signs & Oxygen */}
      <Accordion
        expanded={expandedAccordion === 'vitals'}
        onChange={handleAccordionChange('vitals')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">J1400: Vital Signs & Oxygen</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="j1400_oxygen_dependent"
                    checked={formData.j1400_oxygen_dependent || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Oxygen dependent"
              />
            </Grid>
            {formData.j1400_oxygen_dependent && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Oxygen Liters/min"
                    name="j1400_oxygen_liters"
                    value={formData.j1400_oxygen_liters || ''}
                    onChange={handleNumberChange}
                    disabled={!isEditable}
                    inputProps={{ min: 0, max: 15 }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth disabled={!isEditable}>
                    <InputLabel>Oxygen Method</InputLabel>
                    <Select
                      name="j1400_oxygen_method"
                      value={formData.j1400_oxygen_method || ''}
                      label="Oxygen Method"
                      onChange={handleSelectChange}
                    >
                      {OXYGEN_METHODS.map((method) => (
                        <MenuItem key={method.value} value={method.value}>{method.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SectionJ_HealthConditions;
