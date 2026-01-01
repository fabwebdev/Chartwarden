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

const CANCER_STAGES = [
  { value: 'I', label: 'Stage I' },
  { value: 'II', label: 'Stage II' },
  { value: 'III', label: 'Stage III' },
  { value: 'IV', label: 'Stage IV' },
  { value: 'UNKNOWN', label: 'Unknown' }
];

const COMMON_METASTATIC_SITES = [
  'Liver',
  'Lung',
  'Bone',
  'Brain',
  'Lymph Nodes',
  'Peritoneum',
  'Adrenal Glands',
  'Other'
];

// ==============================|| INTERFACES ||============================== //

interface SectionIProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
}

interface OtherDiagnosis {
  icd10: string;
  description: string;
  is_related?: boolean;
}

// ==============================|| SECTION I COMPONENT ||============================== //

const SectionI_Diagnoses = ({
  formData,
  onFormChange,
  isEditable
}: SectionIProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('principal');
  const [newDiagnosis, setNewDiagnosis] = useState<OtherDiagnosis>({
    icd10: '',
    description: '',
    is_related: true
  });

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

  // Handle other diagnoses
  const handleAddDiagnosis = () => {
    if (newDiagnosis.icd10 && newDiagnosis.description) {
      const currentDiagnoses = formData.i0020_other_diagnoses || [];
      onFormChange({
        i0020_other_diagnoses: [...currentDiagnoses, newDiagnosis]
      });
      setNewDiagnosis({ icd10: '', description: '', is_related: true });
    }
  };

  const handleRemoveDiagnosis = (index: number) => {
    const currentDiagnoses = formData.i0020_other_diagnoses || [];
    onFormChange({
      i0020_other_diagnoses: currentDiagnoses.filter((_, i) => i !== index)
    });
  };

  // Handle metastatic sites
  const handleMetastaticSiteChange = (site: string) => {
    const currentSites = formData.i0100_cancer_metastatic_sites || [];
    const updatedSites = currentSites.includes(site)
      ? currentSites.filter((s: string) => s !== site)
      : [...currentSites, site];
    onFormChange({ i0100_cancer_metastatic_sites: updatedSites });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section I: Active Diagnoses
      </Typography>

      {/* Principal Diagnosis */}
      <Accordion
        expanded={expandedAccordion === 'principal'}
        onChange={handleAccordionChange('principal')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">I0010: Principal Diagnosis</Typography>
            {formData.i0010_principal_diagnosis_icd10 && (
              <Chip
                label={formData.i0010_principal_diagnosis_icd10}
                size="small"
                color="primary"
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                required
                label="ICD-10 Code *"
                name="i0010_principal_diagnosis_icd10"
                value={formData.i0010_principal_diagnosis_icd10 || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Primary terminal diagnosis ICD-10 code"
                error={!formData.i0010_principal_diagnosis_icd10}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Description"
                name="i0010_principal_diagnosis_description"
                value={formData.i0010_principal_diagnosis_description || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Full diagnosis description"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Other Diagnoses */}
      <Accordion
        expanded={expandedAccordion === 'other'}
        onChange={handleAccordionChange('other')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">I0020: Other Diagnoses</Typography>
            <Chip
              label={`${(formData.i0020_other_diagnoses || []).length} diagnoses`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          {/* Existing diagnoses */}
          {(formData.i0020_other_diagnoses || []).length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {(formData.i0020_other_diagnoses || []).map((diagnosis: OtherDiagnosis, index: number) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip label={diagnosis.icd10} size="small" color="info" />
                        <Typography variant="body2">{diagnosis.description}</Typography>
                        {diagnosis.is_related && (
                          <Chip label="Related" size="small" variant="outlined" />
                        )}
                      </Stack>
                      {isEditable && (
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveDiagnosis(index)}
                          color="error"
                        >
                          <Trash size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Add new diagnosis */}
          {isEditable && (
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="ICD-10 Code"
                  value={newDiagnosis.icd10}
                  onChange={(e) => setNewDiagnosis({ ...newDiagnosis, icd10: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  value={newDiagnosis.description}
                  onChange={(e) => setNewDiagnosis({ ...newDiagnosis, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newDiagnosis.is_related}
                      onChange={(e) => setNewDiagnosis({ ...newDiagnosis, is_related: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Related"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Add size={16} />}
                  onClick={handleAddDiagnosis}
                  disabled={!newDiagnosis.icd10 || !newDiagnosis.description}
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

      {/* Cancer Details */}
      <Accordion
        expanded={expandedAccordion === 'cancer'}
        onChange={handleAccordionChange('cancer')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">I0100: Cancer Diagnosis Details</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Cancer Site"
                name="i0100_cancer_primary_site"
                value={formData.i0100_cancer_primary_site || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="e.g., Lung, Breast, Colon, Pancreas"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Cancer Stage</InputLabel>
                <Select
                  name="i0100_cancer_stage"
                  value={formData.i0100_cancer_stage || ''}
                  label="Cancer Stage"
                  onChange={handleSelectChange}
                >
                  {CANCER_STAGES.map((stage) => (
                    <MenuItem key={stage.value} value={stage.value}>
                      {stage.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="i0100_cancer_metastatic"
                    checked={formData.i0100_cancer_metastatic || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Metastatic Disease Present"
              />
            </Grid>
            {formData.i0100_cancer_metastatic && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Metastatic Sites (check all that apply)
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {COMMON_METASTATIC_SITES.map((site) => (
                    <FormControlLabel
                      key={site}
                      control={
                        <Checkbox
                          checked={(formData.i0100_cancer_metastatic_sites || []).includes(site)}
                          onChange={() => handleMetastaticSiteChange(site)}
                          disabled={!isEditable}
                          size="small"
                        />
                      }
                      label={site}
                    />
                  ))}
                </Stack>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Prognosis */}
      <Accordion
        expanded={expandedAccordion === 'prognosis'}
        onChange={handleAccordionChange('prognosis')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">I0300: Prognosis Indicator</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Prognosis (months)"
                name="i0300_prognosis_months"
                value={formData.i0300_prognosis_months || ''}
                onChange={handleNumberChange}
                disabled={!isEditable}
                inputProps={{ min: 0, max: 24 }}
                helperText="Expected prognosis in months (typically 6 or less for hospice)"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Comorbidities */}
      <Accordion
        expanded={expandedAccordion === 'comorbidities'}
        onChange={handleAccordionChange('comorbidities')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">I0200: Comorbidities</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Document significant comorbid conditions affecting care. Add additional diagnoses in the Other Diagnoses section above.
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Comorbidities Summary"
                name="i0200_comorbidities_notes"
                value={Array.isArray(formData.i0200_comorbidities) ? formData.i0200_comorbidities.join('\n') : ''}
                onChange={(e) => {
                  const comorbidities = e.target.value.split('\n').filter(c => c.trim());
                  onFormChange({ i0200_comorbidities: comorbidities });
                }}
                disabled={!isEditable}
                helperText="Enter each comorbidity on a new line"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SectionI_Diagnoses;
