'use client';

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
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2 } from 'iconsax-react';
import { HOPEAssessmentFormData } from '../../../../api/hopeAssessment';
import { useState } from 'react';

// ==============================|| CONSTANTS ||============================== //

const RECORD_TYPES = [
  { value: '1', label: '1 - Add' },
  { value: '2', label: '2 - Modify' },
  { value: '3', label: '3 - Inactivate' }
];

const ASSESSMENT_TYPE_CODES = [
  { value: '01', label: '01 - Admission' },
  { value: '02', label: '02 - Hospice Update Visit' },
  { value: '09', label: '09 - Discharge' }
];

const ASSESSMENT_REASONS = [
  { value: '01', label: '01 - Admission' },
  { value: '02', label: '02 - Scheduled Assessment' },
  { value: '03', label: '03 - Unscheduled Assessment' }
];

const UNITS_OF_SERVICE = [
  { value: '01', label: '01 - Routine Home Care' },
  { value: '02', label: '02 - Continuous Home Care' },
  { value: '03', label: '03 - General Inpatient Care' },
  { value: '04', label: '04 - Inpatient Respite Care' }
];

const ETHNICITIES = [
  { value: 'A', label: 'A - Hispanic or Latino' },
  { value: 'B', label: 'B - Not Hispanic or Latino' },
  { value: 'C', label: 'C - Unknown' }
];

const RACES = [
  { value: 'A', label: 'White' },
  { value: 'B', label: 'Black or African American' },
  { value: 'C', label: 'American Indian or Alaska Native' },
  { value: 'D', label: 'Asian' },
  { value: 'E', label: 'Native Hawaiian or Pacific Islander' },
  { value: 'F', label: 'Unable to determine' }
];

// ==============================|| INTERFACES ||============================== //

interface SectionAProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
  patientData?: any;
}

// ==============================|| SECTION A COMPONENT ||============================== //

const SectionA_AdministrativeInfo = ({
  formData,
  onFormChange,
  isEditable,
  patientData
}: SectionAProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('facility');

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

  const handleRaceChange = (raceCode: string) => {
    const currentRaces = formData.a1010_race || [];
    const updatedRaces = currentRaces.includes(raceCode)
      ? currentRaces.filter((r: string) => r !== raceCode)
      : [...currentRaces, raceCode];
    onFormChange({ a1010_race: updatedRaces });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section A: Administrative Information
      </Typography>

      {/* Facility Information */}
      <Accordion
        expanded={expandedAccordion === 'facility'}
        onChange={handleAccordionChange('facility')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">A0100: Facility Provider Numbers</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A0100a: National Provider Identifier (NPI)"
                name="a0100a_npi"
                value={formData.a0100a_npi || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                inputProps={{ maxLength: 10 }}
                helperText="10-digit NPI number"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A0100b: CMS Certification Number (CCN)"
                name="a0100b_cms_certification_number"
                value={formData.a0100b_cms_certification_number || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Medicare provider number"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Record Type */}
      <Accordion
        expanded={expandedAccordion === 'record'}
        onChange={handleAccordionChange('record')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">A0050: Type of Record</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Type of Record</InputLabel>
                <Select
                  name="a0050_record_type"
                  value={formData.a0050_record_type || ''}
                  label="Type of Record"
                  onChange={handleSelectChange}
                >
                  {RECORD_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Assessment Information */}
      <Accordion
        expanded={expandedAccordion === 'assessment'}
        onChange={handleAccordionChange('assessment')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Assessment Details</Typography>
            <Chip
              label={formData.assessment_type || 'ADMISSION'}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>A0200: Type of Assessment</InputLabel>
                <Select
                  name="a0200_assessment_type_code"
                  value={formData.a0200_assessment_type_code || ''}
                  label="A0200: Type of Assessment"
                  onChange={handleSelectChange}
                >
                  {ASSESSMENT_TYPE_CODES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>A0250: Reason for Assessment</InputLabel>
                <Select
                  name="a0250_assessment_reason"
                  value={formData.a0250_assessment_reason || ''}
                  label="A0250: Reason for Assessment"
                  onChange={handleSelectChange}
                >
                  {ASSESSMENT_REASONS.map((reason) => (
                    <MenuItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A0310: Assessment Reference Date *"
                name="a0310_assessment_reference_date"
                type="date"
                value={formData.a0310_assessment_reference_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
                required
                helperText="CMS required field"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>A0410: Unit of Service</InputLabel>
                <Select
                  name="a0410_unit_of_service"
                  value={formData.a0410_unit_of_service || ''}
                  label="A0410: Unit of Service"
                  onChange={handleSelectChange}
                >
                  {UNITS_OF_SERVICE.map((unit) => (
                    <MenuItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Admission/Discharge Dates */}
      <Accordion
        expanded={expandedAccordion === 'dates'}
        onChange={handleAccordionChange('dates')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">A0220/A0270: Admission & Discharge Dates</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A0220: Admission Date"
                name="a0220_admission_date"
                type="date"
                value={formData.a0220_admission_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
                helperText="Date patient was admitted to hospice"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A0270: Discharge Date"
                name="a0270_discharge_date"
                type="date"
                value={formData.a0270_discharge_date || ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
                helperText="Date of discharge (if applicable)"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Demographics */}
      <Accordion
        expanded={expandedAccordion === 'demographics'}
        onChange={handleAccordionChange('demographics')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">A1005/A1010/A1110: Demographics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>A1005: Ethnicity</InputLabel>
                <Select
                  name="a1005_ethnicity"
                  value={formData.a1005_ethnicity || ''}
                  label="A1005: Ethnicity"
                  onChange={handleSelectChange}
                >
                  {ETHNICITIES.map((eth) => (
                    <MenuItem key={eth.value} value={eth.value}>
                      {eth.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                A1010: Race (check all that apply)
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {RACES.map((race) => (
                  <FormControlLabel
                    key={race.value}
                    control={
                      <Checkbox
                        checked={(formData.a1010_race || []).includes(race.value)}
                        onChange={() => handleRaceChange(race.value)}
                        disabled={!isEditable}
                        size="small"
                      />
                    }
                    label={race.label}
                    sx={{ mr: 2 }}
                  />
                ))}
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="A1110a: Primary Language"
                name="a1110a_primary_language"
                value={formData.a1110a_primary_language || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="a1110b_language_need_interpreter"
                    checked={formData.a1110b_language_need_interpreter || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="A1110b: Interpreter needed"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Patient Info Summary (from patient record) */}
      {patientData && (
        <Accordion
          expanded={expandedAccordion === 'patient'}
          onChange={handleAccordionChange('patient')}
        >
          <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
            <Typography variant="h6">Patient Information (Reference)</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Name</Typography>
                <Typography variant="body1">
                  {patientData.first_name} {patientData.last_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">MRN</Typography>
                <Typography variant="body1">{patientData.mrn || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Date of Birth</Typography>
                <Typography variant="body1">
                  {patientData.dob ? new Date(patientData.dob).toLocaleDateString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Gender</Typography>
                <Typography variant="body1">{patientData.gender || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body1">
                  {patientData.address || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body1">{patientData.phone || 'N/A'}</Typography>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default SectionA_AdministrativeInfo;
