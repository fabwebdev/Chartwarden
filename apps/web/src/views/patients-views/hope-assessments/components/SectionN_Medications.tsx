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
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2, Add, Trash, Warning2 } from 'iconsax-react';
import { HOPEAssessmentFormData } from '../../../../api/hopeAssessment';

// ==============================|| CONSTANTS ||============================== //

const MEDICATION_EFFECTIVENESS = [
  { value: 'EFFECTIVE', label: 'Effective' },
  { value: 'PARTIALLY_EFFECTIVE', label: 'Partially Effective' },
  { value: 'NOT_EFFECTIVE', label: 'Not Effective' },
  { value: 'UNABLE_TO_ASSESS', label: 'Unable to Assess' }
];

const COMMON_SYMPTOMS = [
  'Pain',
  'Dyspnea',
  'Nausea',
  'Anxiety',
  'Insomnia',
  'Constipation',
  'Depression',
  'Agitation'
];

// ==============================|| INTERFACES ||============================== //

interface SectionNProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
}

interface SymptomMedication {
  medication: string;
  symptom: string;
  effectiveness?: string;
}

// ==============================|| SECTION N COMPONENT ||============================== //

const SectionN_Medications = ({
  formData,
  onFormChange,
  isEditable
}: SectionNProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('high-risk');
  const [newSymptomMed, setNewSymptomMed] = useState<SymptomMedication>({
    medication: '',
    symptom: '',
    effectiveness: ''
  });

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    onFormChange({ [name]: checked });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });
  };

  // Handle symptom medications
  const handleAddSymptomMed = () => {
    if (newSymptomMed.medication && newSymptomMed.symptom) {
      const current = formData.n0300_symptom_medications || [];
      onFormChange({
        n0300_symptom_medications: [...current, newSymptomMed]
      });
      setNewSymptomMed({ medication: '', symptom: '', effectiveness: '' });
    }
  };

  const handleRemoveSymptomMed = (index: number) => {
    const current = formData.n0300_symptom_medications || [];
    onFormChange({
      n0300_symptom_medications: current.filter((_: SymptomMedication, i: number) => i !== index)
    });
  };

  // Check for high-risk medications
  const hasHighRiskMeds =
    formData.n0100_opioid_medications ||
    formData.n0100_antipsychotic_medications ||
    formData.n0100_anticoagulant_medications ||
    formData.n0100_insulin_medications;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section N: Medications
      </Typography>

      {hasHighRiskMeds && (
        <Alert severity="info" sx={{ mb: 2 }} icon={<Warning2 size={20} />}>
          <Typography variant="subtitle2">High-Risk Medications Present</Typography>
          <Typography variant="body2">
            This patient is on high-risk medications. Ensure appropriate monitoring and education.
          </Typography>
        </Alert>
      )}

      {/* High-Risk Medication Categories */}
      <Accordion
        expanded={expandedAccordion === 'high-risk'}
        onChange={handleAccordionChange('high-risk')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">N0100: High-Risk Medication Categories</Typography>
            {hasHighRiskMeds && (
              <Chip label="High-risk meds" size="small" color="warning" />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0100_opioid_medications"
                    checked={formData.n0100_opioid_medications || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Opioid medications"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0100_antipsychotic_medications"
                    checked={formData.n0100_antipsychotic_medications || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Antipsychotic medications"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0100_anticoagulant_medications"
                    checked={formData.n0100_anticoagulant_medications || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Anticoagulant medications"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0100_insulin_medications"
                    checked={formData.n0100_insulin_medications || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Insulin medications"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Medication Management */}
      <Accordion
        expanded={expandedAccordion === 'management'}
        onChange={handleAccordionChange('management')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">N0200: Medication Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0200_medication_regimen_review"
                    checked={formData.n0200_medication_regimen_review || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Medication regimen reviewed"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0200_medication_reconciliation"
                    checked={formData.n0200_medication_reconciliation || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Medication reconciliation completed"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0200_medication_education"
                    checked={formData.n0200_medication_education || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Medication education provided"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0200_polypharmacy"
                    checked={formData.n0200_polypharmacy || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Polypharmacy present (9+ medications)"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Medication Concerns/Issues"
                name="n0200_medication_concerns"
                value={formData.n0200_medication_concerns || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Document any medication-related concerns, side effects, or issues"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Symptom Medications */}
      <Accordion
        expanded={expandedAccordion === 'symptom'}
        onChange={handleAccordionChange('symptom')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">N0300: Symptom Medications</Typography>
            <Chip
              label={`${(formData.n0300_symptom_medications || []).length} medications`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Document medications used for symptom management and their effectiveness.
          </Typography>

          {/* Existing symptom medications */}
          {(formData.n0300_symptom_medications || []).length > 0 && (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {(formData.n0300_symptom_medications || []).map((med: SymptomMedication, index: number) => (
                <Card key={index} variant="outlined">
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body1" fontWeight="medium">{med.medication}</Typography>
                        <Chip label={med.symptom} size="small" color="primary" variant="outlined" />
                        {med.effectiveness && (
                          <Chip
                            label={med.effectiveness}
                            size="small"
                            color={
                              med.effectiveness === 'EFFECTIVE' ? 'success' :
                              med.effectiveness === 'PARTIALLY_EFFECTIVE' ? 'warning' : 'error'
                            }
                          />
                        )}
                      </Stack>
                      {isEditable && (
                        <IconButton size="small" onClick={() => handleRemoveSymptomMed(index)} color="error">
                          <Trash size={16} />
                        </IconButton>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}

          {/* Add new symptom medication */}
          {isEditable && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Medication Name"
                  value={newSymptomMed.medication}
                  onChange={(e) => setNewSymptomMed({ ...newSymptomMed, medication: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Target Symptom</InputLabel>
                  <Select
                    value={newSymptomMed.symptom}
                    label="Target Symptom"
                    onChange={(e) => setNewSymptomMed({ ...newSymptomMed, symptom: e.target.value })}
                  >
                    {COMMON_SYMPTOMS.map((symptom) => (
                      <MenuItem key={symptom} value={symptom}>{symptom}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Effectiveness</InputLabel>
                  <Select
                    value={newSymptomMed.effectiveness}
                    label="Effectiveness"
                    onChange={(e) => setNewSymptomMed({ ...newSymptomMed, effectiveness: e.target.value })}
                  >
                    {MEDICATION_EFFECTIVENESS.map((eff) => (
                      <MenuItem key={eff.value} value={eff.value}>{eff.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<Add size={16} />}
                  onClick={handleAddSymptomMed}
                  disabled={!newSymptomMed.medication || !newSymptomMed.symptom}
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

      {/* Administration Routes */}
      <Accordion
        expanded={expandedAccordion === 'routes'}
        onChange={handleAccordionChange('routes')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">N0400: Administration Routes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Check all medication administration routes currently in use.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_oral"
                    checked={formData.n0400_route_oral || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Oral (PO)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_sublingual"
                    checked={formData.n0400_route_sublingual || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Sublingual (SL)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_transdermal"
                    checked={formData.n0400_route_transdermal || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Transdermal (TD)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_iv"
                    checked={formData.n0400_route_iv || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Intravenous (IV)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_subcutaneous"
                    checked={formData.n0400_route_subcutaneous || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Subcutaneous (SQ)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_rectal"
                    checked={formData.n0400_route_rectal || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Rectal (PR)"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="n0400_route_intramuscular"
                    checked={formData.n0400_route_intramuscular || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="Intramuscular (IM)"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default SectionN_Medications;
