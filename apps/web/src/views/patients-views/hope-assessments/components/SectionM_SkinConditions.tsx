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
  Button,
  IconButton,
  Chip,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2, Add, Trash } from 'iconsax-react';
import { HOPEAssessmentFormData } from '../../../../api/hopeAssessment';

// ==============================|| CONSTANTS ||============================== //

const PRESSURE_ULCER_STAGES = [
  { value: 'STAGE_1', label: 'Stage 1' },
  { value: 'STAGE_2', label: 'Stage 2' },
  { value: 'STAGE_3', label: 'Stage 3' },
  { value: 'STAGE_4', label: 'Stage 4' },
  { value: 'UNSTAGEABLE', label: 'Unstageable' },
  { value: 'SUSPECTED_DTI', label: 'Suspected Deep Tissue Injury' }
];

const COMMON_LOCATIONS = [
  'Sacrum',
  'Coccyx',
  'Right Heel',
  'Left Heel',
  'Right Hip',
  'Left Hip',
  'Right Elbow',
  'Left Elbow',
  'Occiput',
  'Shoulder',
  'Other'
];

const HEALING_STATUS = [
  { value: 'HEALING', label: 'Healing' },
  { value: 'STABLE', label: 'Stable' },
  { value: 'WORSENING', label: 'Worsening' },
  { value: 'NEW', label: 'New' }
];

const WOUND_TYPES = [
  { value: 'SURGICAL', label: 'Surgical Wound' },
  { value: 'VENOUS', label: 'Venous Ulcer' },
  { value: 'ARTERIAL', label: 'Arterial Ulcer' },
  { value: 'DIABETIC', label: 'Diabetic Ulcer' },
  { value: 'SKIN_TEAR', label: 'Skin Tear' },
  { value: 'TUMOR', label: 'Fungating Tumor' },
  { value: 'OTHER', label: 'Other' }
];

const SKIN_RISK_FACTORS = [
  'Immobility',
  'Incontinence',
  'Poor Nutrition',
  'Edema',
  'Diabetes',
  'Vascular Disease',
  'Steroids',
  'Advanced Age',
  'Friction/Shear'
];

const SKIN_TREATMENTS = [
  'Repositioning',
  'Pressure-relieving mattress',
  'Heel protectors',
  'Moisture barrier',
  'Wound dressing',
  'Debridement',
  'Negative pressure therapy',
  'Compression therapy'
];

// ==============================|| INTERFACES ||============================== //

interface SectionMProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
}

interface PressureUlcer {
  stage: string;
  location: string;
  size?: string;
  healing_status?: string;
}

interface OtherWound {
  type: string;
  location: string;
  size?: string;
  treatment?: string;
}

// ==============================|| SECTION M COMPONENT ||============================== //

const SectionM_SkinConditions = ({
  formData,
  onFormChange,
  isEditable
}: SectionMProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('integrity');
  const [newPressureUlcer, setNewPressureUlcer] = useState<PressureUlcer>({
    stage: '',
    location: '',
    size: '',
    healing_status: ''
  });
  const [newWound, setNewWound] = useState<OtherWound>({
    type: '',
    location: '',
    size: '',
    treatment: ''
  });

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFormChange({ [name]: checked });
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value ? parseInt(value) : undefined });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  // Handle risk factors
  const handleRiskFactorChange = (factor: string) => {
    const current = formData.m0100_skin_risk_factors || [];
    const updated = current.includes(factor)
      ? current.filter((f: string) => f !== factor)
      : [...current, factor];
    onFormChange({ m0100_skin_risk_factors: updated });
  };

  // Handle treatments
  const handleTreatmentChange = (treatment: string) => {
    const current = formData.m0400_skin_treatments || [];
    const updated = current.includes(treatment)
      ? current.filter((t: string) => t !== treatment)
      : [...current, treatment];
    onFormChange({ m0400_skin_treatments: updated });
  };

  // Handle pressure ulcers
  const handleAddPressureUlcer = () => {
    if (newPressureUlcer.stage && newPressureUlcer.location) {
      const current = formData.m0200_pressure_ulcers || [];
      onFormChange({
        m0200_pressure_ulcers: [...current, newPressureUlcer],
        m0200_pressure_ulcer_present: true
      });
      setNewPressureUlcer({ stage: '', location: '', size: '', healing_status: '' });
    }
  };

  const handleRemovePressureUlcer = (index: number) => {
    const current = formData.m0200_pressure_ulcers || [];
    const updated = current.filter((_: PressureUlcer, i: number) => i !== index);
    onFormChange({
      m0200_pressure_ulcers: updated,
      m0200_pressure_ulcer_present: updated.length > 0
    });
  };

  // Handle other wounds
  const handleAddWound = () => {
    if (newWound.type && newWound.location) {
      const current = formData.m0300_other_wounds || [];
      onFormChange({
        m0300_other_wounds: [...current, newWound],
        m0300_other_wounds_present: true
      });
      setNewWound({ type: '', location: '', size: '', treatment: '' });
    }
  };

  const handleRemoveWound = (index: number) => {
    const current = formData.m0300_other_wounds || [];
    const updated = current.filter((_: OtherWound, i: number) => i !== index);
    onFormChange({
      m0300_other_wounds: updated,
      m0300_other_wounds_present: updated.length > 0
    });
  };

  // Calculate Braden score
  const bradenTotal =
    (formData.m0500_braden_sensory || 0) +
    (formData.m0500_braden_moisture || 0) +
    (formData.m0500_braden_activity || 0) +
    (formData.m0500_braden_mobility || 0) +
    (formData.m0500_braden_nutrition || 0) +
    (formData.m0500_braden_friction || 0);

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section M: Skin Conditions
      </Typography>

      {/* Skin Integrity */}
      <Accordion
        expanded={expandedAccordion === 'integrity'}
        onChange={handleAccordionChange('integrity')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">M0100: Skin Integrity</Typography>
            {formData.m0100_skin_intact === false && (
              <Chip label="Impaired" size="small" color="warning" />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="m0100_skin_intact"
                    checked={formData.m0100_skin_intact || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Skin intact"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="m0100_skin_at_risk"
                    checked={formData.m0100_skin_at_risk || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="At risk for skin breakdown"
              />
            </Grid>
            {formData.m0100_skin_at_risk && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Risk Factors (check all that apply)
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {SKIN_RISK_FACTORS.map((factor) => (
                    <FormControlLabel
                      key={factor}
                      control={
                        <Checkbox
                          checked={(formData.m0100_skin_risk_factors || []).includes(factor)}
                          onChange={() => handleRiskFactorChange(factor)}
                          disabled={!isEditable}
                          size="small"
                        />
                      }
                      label={factor}
                    />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Pressure Ulcers */}
      <Accordion
        expanded={expandedAccordion === 'pressure'}
        onChange={handleAccordionChange('pressure')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">M0200: Pressure Ulcers</Typography>
            <Chip
              label={`${(formData.m0200_pressure_ulcers || []).length} ulcers`}
              size="small"
              color={(formData.m0200_pressure_ulcers || []).length > 0 ? 'error' : 'default'}
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="m0200_new_pressure_ulcer"
                    checked={formData.m0200_new_pressure_ulcer || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="New pressure ulcer since last assessment"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="m0200_worsened_pressure_ulcer"
                    checked={formData.m0200_worsened_pressure_ulcer || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Pressure ulcer worsened since last assessment"
              />
            </Grid>
          </Grid>

          {/* Existing pressure ulcers */}
          {(formData.m0200_pressure_ulcers || []).length > 0 && (
            <Stack spacing={1} sx={{ my: 2 }}>
              {(formData.m0200_pressure_ulcers || []).map((ulcer: PressureUlcer, index: number) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={ulcer.stage} size="small" color="error" />
                        <Typography variant="body2">{ulcer.location}</Typography>
                        {ulcer.size && <Typography variant="body2" color="text.secondary">Size: {ulcer.size}</Typography>}
                        {ulcer.healing_status && (
                          <Chip label={ulcer.healing_status} size="small" variant="outlined" />
                        )}
                      </Stack>
                      {isEditable && (
                        <IconButton size="small" onClick={() => handleRemovePressureUlcer(index)} color="error">
                          <Trash size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Add new pressure ulcer */}
          {isEditable && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Stage</InputLabel>
                  <Select
                    value={newPressureUlcer.stage}
                    label="Stage"
                    onChange={(e) => setNewPressureUlcer({ ...newPressureUlcer, stage: e.target.value })}
                  >
                    {PRESSURE_ULCER_STAGES.map((stage) => (
                      <MenuItem key={stage.value} value={stage.value}>{stage.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={newPressureUlcer.location}
                    label="Location"
                    onChange={(e) => setNewPressureUlcer({ ...newPressureUlcer, location: e.target.value })}
                  >
                    {COMMON_LOCATIONS.map((loc) => (
                      <MenuItem key={loc} value={loc}>{loc}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Size (cm)"
                  value={newPressureUlcer.size}
                  onChange={(e) => setNewPressureUlcer({ ...newPressureUlcer, size: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newPressureUlcer.healing_status}
                    label="Status"
                    onChange={(e) => setNewPressureUlcer({ ...newPressureUlcer, healing_status: e.target.value })}
                  >
                    {HEALING_STATUS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Add size={16} />}
                  onClick={handleAddPressureUlcer}
                  disabled={!newPressureUlcer.stage || !newPressureUlcer.location}
                  size="small"
                  fullWidth
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Other Wounds */}
      <Accordion
        expanded={expandedAccordion === 'wounds'}
        onChange={handleAccordionChange('wounds')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">M0300: Other Wounds</Typography>
            <Chip
              label={`${(formData.m0300_other_wounds || []).length} wounds`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {/* Existing wounds */}
          {(formData.m0300_other_wounds || []).length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {(formData.m0300_other_wounds || []).map((wound: OtherWound, index: number) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={wound.type} size="small" color="info" />
                        <Typography variant="body2">{wound.location}</Typography>
                        {wound.size && <Typography variant="body2" color="text.secondary">Size: {wound.size}</Typography>}
                        {wound.treatment && (
                          <Typography variant="body2" color="text.secondary">Tx: {wound.treatment}</Typography>
                        )}
                      </Stack>
                      {isEditable && (
                        <IconButton size="small" onClick={() => handleRemoveWound(index)} color="error">
                          <Trash size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Add new wound */}
          {isEditable && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newWound.type}
                    label="Type"
                    onChange={(e) => setNewWound({ ...newWound, type: e.target.value })}
                  >
                    {WOUND_TYPES.map((type) => (
                      <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location"
                  value={newWound.location}
                  onChange={(e) => setNewWound({ ...newWound, location: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Size (cm)"
                  value={newWound.size}
                  onChange={(e) => setNewWound({ ...newWound, size: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Treatment"
                  value={newWound.treatment}
                  onChange={(e) => setNewWound({ ...newWound, treatment: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Add size={16} />}
                  onClick={handleAddWound}
                  disabled={!newWound.type || !newWound.location}
                  size="small"
                  fullWidth
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Treatments */}
      <Accordion
        expanded={expandedAccordion === 'treatments'}
        onChange={handleAccordionChange('treatments')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">M0400: Skin Treatments</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current Treatments (check all that apply)
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {SKIN_TREATMENTS.map((treatment) => (
                  <FormControlLabel
                    key={treatment}
                    control={
                      <Checkbox
                        checked={(formData.m0400_skin_treatments || []).includes(treatment)}
                        onChange={() => handleTreatmentChange(treatment)}
                        disabled={!isEditable}
                        size="small"
                      />
                    }
                    label={treatment}
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Wound Care Orders"
                name="m0400_wound_care_orders"
                value={formData.m0400_wound_care_orders || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Document current wound care orders and frequency"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Braden Scale */}
      <Accordion
        expanded={expandedAccordion === 'braden'}
        onChange={handleAccordionChange('braden')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">M0500: Braden Scale</Typography>
            {bradenTotal > 0 && (
              <Chip
                label={`Score: ${bradenTotal}/23`}
                size="small"
                color={bradenTotal <= 12 ? 'error' : bradenTotal <= 14 ? 'warning' : bradenTotal <= 18 ? 'info' : 'success'}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Risk levels: &lt;=12 High Risk, 13-14 Moderate Risk, 15-18 Low Risk, &gt;18 No Risk
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Sensory Perception (1-4)"
                name="m0500_braden_sensory"
                value={formData.m0500_braden_sensory ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 4 }}
                helperText="1=Completely limited, 4=No impairment"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Moisture (1-4)"
                name="m0500_braden_moisture"
                value={formData.m0500_braden_moisture ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 4 }}
                helperText="1=Constantly moist, 4=Rarely moist"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Activity (1-4)"
                name="m0500_braden_activity"
                value={formData.m0500_braden_activity ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 4 }}
                helperText="1=Bedfast, 4=Walks frequently"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Mobility (1-4)"
                name="m0500_braden_mobility"
                value={formData.m0500_braden_mobility ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 4 }}
                helperText="1=Completely immobile, 4=No limitations"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Nutrition (1-4)"
                name="m0500_braden_nutrition"
                value={formData.m0500_braden_nutrition ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 4 }}
                helperText="1=Very poor, 4=Excellent"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Friction & Shear (1-3)"
                name="m0500_braden_friction"
                value={formData.m0500_braden_friction ?? ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 1, max: 3 }}
                helperText="1=Problem, 3=No apparent problem"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="Total Score"
                name="m0500_braden_total_score"
                value={formData.m0500_braden_total_score ?? bradenTotal || ''}
                InputProps={{ readOnly: true }}
                helperText="Calculated: sum of all subscales"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SectionM_SkinConditions;
