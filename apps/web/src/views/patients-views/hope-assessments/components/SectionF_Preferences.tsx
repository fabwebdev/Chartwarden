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
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2 } from 'iconsax-react';
import { HOPEAssessmentFormData } from '../../../../api/hopeAssessment';

// ==============================|| CONSTANTS ||============================== //

const HOSPITALIZATION_PREFERENCES = [
  { value: '0', label: '0 - No preference stated' },
  { value: '1', label: '1 - Prefer hospital if needed' },
  { value: '2', label: '2 - Prefer to avoid hospitalization' },
  { value: '9', label: '9 - Unknown' }
];

const CODE_STATUSES = [
  { value: 'FULL_CODE', label: 'Full Code' },
  { value: 'DNR', label: 'DNR (Do Not Resuscitate)' },
  { value: 'DNI', label: 'DNI (Do Not Intubate)' },
  { value: 'DNR_DNI', label: 'DNR/DNI' },
  { value: 'LIMITED_CODE', label: 'Limited Code' },
  { value: 'COMFORT_CARE', label: 'Comfort Care Only' }
];

const CAREGIVER_RELATIONSHIPS = [
  { value: 'SPOUSE', label: 'Spouse/Partner' },
  { value: 'CHILD', label: 'Adult Child' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'SIBLING', label: 'Sibling' },
  { value: 'OTHER_FAMILY', label: 'Other Family Member' },
  { value: 'FRIEND', label: 'Friend' },
  { value: 'PAID_CAREGIVER', label: 'Paid Caregiver' },
  { value: 'OTHER', label: 'Other' }
];

const STRESS_LEVELS = [
  { value: 'NONE', label: 'None' },
  { value: 'MILD', label: 'Mild' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' }
];

// ==============================|| INTERFACES ||============================== //

interface SectionFProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
}

// ==============================|| SECTION F COMPONENT ||============================== //

const SectionF_Preferences = ({
  formData,
  onFormChange,
  isEditable
}: SectionFProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('goals');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

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

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value ? parseInt(value) : undefined });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section F: Preferences for Customary Routine and Activities
      </Typography>

      {/* Life Story and Goals */}
      <Accordion
        expanded={expandedAccordion === 'goals'}
        onChange={handleAccordionChange('goals')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">F2100: Life Story and Goals</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f2100_life_story_discussed"
                    checked={formData.f2100_life_story_discussed || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Life story discussed with patient/family"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f2100_goals_documented"
                    checked={formData.f2100_goals_documented || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Patient goals documented in care plan"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Hospitalization Preferences */}
      <Accordion
        expanded={expandedAccordion === 'hospitalization'}
        onChange={handleAccordionChange('hospitalization')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">F2200: Hospitalization Preferences</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Hospitalization Preference</InputLabel>
                <Select
                  name="f2200_hospitalization_preference"
                  value={formData.f2200_hospitalization_preference || ''}
                  label="Hospitalization Preference"
                  onChange={handleSelectChange}
                >
                  {HOSPITALIZATION_PREFERENCES.map((pref) => (
                    <MenuItem key={pref.value} value={pref.value}>
                      {pref.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f2200_preference_documented"
                    checked={formData.f2200_preference_documented || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Preference documented"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Date Preference Discussed"
                name="f2200_preference_date"
                type="date"
                value={formData.f2200_preference_date ? formData.f2200_preference_date.split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Code Status and Advance Directives */}
      <Accordion
        expanded={expandedAccordion === 'directives'}
        onChange={handleAccordionChange('directives')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">F2300: Code Status & Advance Directives</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Code Status</InputLabel>
                <Select
                  name="f2300_code_status"
                  value={formData.f2300_code_status || ''}
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
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="f2300_advance_directive_exists"
                      checked={formData.f2300_advance_directive_exists || false}
                      onChange={handleCheckboxChange}
                      disabled={!isEditable}
                    />
                  }
                  label="Advance Directive exists"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="f2300_polst_exists"
                      checked={formData.f2300_polst_exists || false}
                      onChange={handleCheckboxChange}
                      disabled={!isEditable}
                    />
                  }
                  label="POLST/MOLST on file"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="f2300_healthcare_proxy"
                      checked={formData.f2300_healthcare_proxy || false}
                      onChange={handleCheckboxChange}
                      disabled={!isEditable}
                    />
                  }
                  label="Healthcare Proxy designated"
                />
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Spiritual/Existential Concerns */}
      <Accordion
        expanded={expandedAccordion === 'spiritual'}
        onChange={handleAccordionChange('spiritual')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">F3000: Spiritual/Existential Concerns</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f3000_spiritual_concerns_present"
                    checked={formData.f3000_spiritual_concerns_present || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Spiritual concerns present"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f3000_spiritual_needs_addressed"
                    checked={formData.f3000_spiritual_needs_addressed || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Spiritual needs addressed"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f3000_chaplain_referral"
                    checked={formData.f3000_chaplain_referral || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Chaplain referral made"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Spiritual Assessment Notes"
                name="f3000_spiritual_assessment"
                value={formData.f3000_spiritual_assessment || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Document spiritual assessment findings and interventions"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Caregiver Assessment */}
      <Accordion
        expanded={expandedAccordion === 'caregiver'}
        onChange={handleAccordionChange('caregiver')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">F3100: Caregiver Assessment</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="f3100_caregiver_available"
                    checked={formData.f3100_caregiver_available || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Primary caregiver available"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Caregiver Relationship</InputLabel>
                <Select
                  name="f3100_caregiver_relationship"
                  value={formData.f3100_caregiver_relationship || ''}
                  label="Caregiver Relationship"
                  onChange={handleSelectChange}
                >
                  {CAREGIVER_RELATIONSHIPS.map((rel) => (
                    <MenuItem key={rel.value} value={rel.value}>
                      {rel.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Caregiver Hours per Week"
                name="f3100_caregiver_hours_per_week"
                value={formData.f3100_caregiver_hours_per_week || ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 168 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Caregiver Stress Level</InputLabel>
                <Select
                  name="f3100_caregiver_stress_level"
                  value={formData.f3100_caregiver_stress_level || ''}
                  label="Caregiver Stress Level"
                  onChange={handleSelectChange}
                >
                  {STRESS_LEVELS.map((level) => (
                    <MenuItem key={level.value} value={level.value}>
                      {level.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="f3100_caregiver_support_adequate"
                      checked={formData.f3100_caregiver_support_adequate || false}
                      onChange={handleCheckboxChange}
                      disabled={!isEditable}
                    />
                  }
                  label="Support adequate"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="f3100_caregiver_training_needed"
                      checked={formData.f3100_caregiver_training_needed || false}
                      onChange={handleCheckboxChange}
                      disabled={!isEditable}
                    />
                  }
                  label="Training needed"
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Caregiver Assessment Notes"
                name="f3100_caregiver_assessment_notes"
                value={formData.f3100_caregiver_assessment_notes || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Document caregiver capabilities, needs, and education provided"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SectionF_Preferences;
