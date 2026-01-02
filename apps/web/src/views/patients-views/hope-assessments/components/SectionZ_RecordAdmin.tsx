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
  Chip,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { ArrowDown2, TickCircle, CloseCircle, Timer1 } from 'iconsax-react';
import { HOPEAssessment, HOPEAssessmentFormData } from '../../../../api/hopeAssessment';

// ==============================|| CONSTANTS ||============================== //

const RECORD_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'DELETED', label: 'Deleted' }
];

const INACTIVATION_REASONS = [
  { value: 'DUPLICATE', label: 'Duplicate Record' },
  { value: 'ERROR', label: 'Entry Error' },
  { value: 'PATIENT_TRANSFER', label: 'Patient Transfer' },
  { value: 'PATIENT_REVOKED', label: 'Patient Revoked Hospice Election' },
  { value: 'OTHER', label: 'Other' }
];

const SUBMISSION_STATUSES = [
  { value: 'NOT_SUBMITTED', label: 'Not Submitted' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ERROR', label: 'Error' }
];

const ASSESSOR_TITLES = [
  { value: 'RN', label: 'Registered Nurse' },
  { value: 'LPN', label: 'Licensed Practical Nurse' },
  { value: 'SW', label: 'Social Worker' },
  { value: 'MD', label: 'Physician' },
  { value: 'NP', label: 'Nurse Practitioner' },
  { value: 'PA', label: 'Physician Assistant' },
  { value: 'OTHER', label: 'Other' }
];

// ==============================|| INTERFACES ||============================== //

interface SectionZProps {
  formData: HOPEAssessmentFormData;
  onFormChange: (updates: Partial<HOPEAssessmentFormData>) => void;
  isEditable: boolean;
  assessment?: HOPEAssessment | null;
}

// ==============================|| SECTION Z COMPONENT ||============================== //

const SectionZ_RecordAdmin = ({
  formData,
  onFormChange,
  isEditable,
  assessment
}: SectionZProps) => {
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('signature');

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

  // Get submission status display
  const getSubmissionStatusDisplay = () => {
    const status = formData.z0200_submission_status || 'NOT_SUBMITTED';
    const statusConfig: Record<string, { color: 'default' | 'primary' | 'success' | 'error' | 'warning'; icon: React.ReactElement | undefined }> = {
      NOT_SUBMITTED: { color: 'default', icon: undefined },
      PENDING: { color: 'warning', icon: <Timer1 size={14} /> },
      ACCEPTED: { color: 'success', icon: <TickCircle size={14} /> },
      REJECTED: { color: 'error', icon: <CloseCircle size={14} /> },
      ERROR: { color: 'error', icon: <CloseCircle size={14} /> }
    };
    return statusConfig[status] || statusConfig.NOT_SUBMITTED;
  };

  const submissionStatus = getSubmissionStatusDisplay();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Section Z: Record Administration
      </Typography>

      {/* Assessment Status Summary */}
      {assessment && (
        <Alert
          severity={
            assessment.assessment_status === 'ACCEPTED' ? 'success' :
            assessment.assessment_status === 'REJECTED' ? 'error' :
            assessment.assessment_status === 'SIGNED' || assessment.assessment_status === 'SUBMITTED' ? 'info' :
            'warning'
          }
          sx={{ mb: 2 }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="subtitle2">Assessment Status: {assessment.assessment_status}</Typography>
            {assessment.completed_date && (
              <Typography variant="body2">
                Completed: {new Date(assessment.completed_date).toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        </Alert>
      )}

      {/* Signature Section */}
      <Accordion
        expanded={expandedAccordion === 'signature'}
        onChange={handleAccordionChange('signature')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Z0100: Assessor Signature</Typography>
            {formData.z0100_assessor_signature_date && (
              <Chip label="Signed" size="small" color="success" icon={<TickCircle size={14} />} />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Signature Date"
                name="z0100_assessor_signature_date"
                type="date"
                value={formData.z0100_assessor_signature_date ? formData.z0100_assessor_signature_date.split('T')[0] : ''}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                disabled={!isEditable}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Assessor Title</InputLabel>
                <Select
                  name="z0100_assessor_title"
                  value={formData.z0100_assessor_title || ''}
                  label="Assessor Title"
                  onChange={handleSelectChange}
                >
                  {ASSESSOR_TITLES.map((title) => (
                    <MenuItem key={title.value} value={title.value}>{title.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Credentials"
                name="z0100_assessor_credentials"
                value={formData.z0100_assessor_credentials || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="e.g., RN, BSN, CHPN"
              />
            </Grid>
          </Grid>

          {/* Signature Display */}
          {formData.signature && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Electronic Signature</Typography>
              <Typography variant="body1">
                {typeof formData.signature === 'object' ?
                  `${formData.signature.name || 'Signed'} - ${formData.signature.date || ''}` :
                  formData.signature
                }
              </Typography>
            </Box>
          )}

          {/* Cosignature if exists */}
          {formData.cosignature && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Co-signature</Typography>
              <Typography variant="body1">
                {typeof formData.cosignature === 'object' ?
                  `${formData.cosignature.name || 'Co-signed'} - ${formData.cosignature.date || ''}` :
                  formData.cosignature
                }
              </Typography>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* CMS Submission */}
      <Accordion
        expanded={expandedAccordion === 'submission'}
        onChange={handleAccordionChange('submission')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">Z0200: CMS iQIES Submission</Typography>
            <Chip
              label={formData.z0200_submission_status || 'Not Submitted'}
              size="small"
              color={submissionStatus.color}
              icon={submissionStatus.icon}
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="z0200_submitted_to_iqies"
                    checked={formData.z0200_submitted_to_iqies || false}
                    onChange={handleCheckboxChange}
                    disabled={true} // Read-only - controlled by system
                  />
                }
                label="Submitted to iQIES"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Submission ID"
                name="z0200_submission_id"
                value={formData.z0200_submission_id || ''}
                InputProps={{ readOnly: true }}
                helperText="Assigned by CMS upon submission"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Submission Date"
                name="z0200_submission_date"
                type="date"
                value={formData.z0200_submission_date ? formData.z0200_submission_date.split('T')[0] : ''}
                InputProps={{ readOnly: true }}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled>
                <InputLabel>Submission Status</InputLabel>
                <Select
                  name="z0200_submission_status"
                  value={formData.z0200_submission_status || ''}
                  label="Submission Status"
                >
                  {SUBMISSION_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.z0200_rejection_reason && (
              <Grid item xs={12}>
                <Alert severity="error">
                  <Typography variant="subtitle2">Rejection Reason:</Typography>
                  <Typography variant="body2">{formData.z0200_rejection_reason}</Typography>
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Record Status */}
      <Accordion
        expanded={expandedAccordion === 'status'}
        onChange={handleAccordionChange('status')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Z0300: Record Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!isEditable}>
                <InputLabel>Record Status</InputLabel>
                <Select
                  name="z0300_record_status"
                  value={formData.z0300_record_status || 'ACTIVE'}
                  label="Record Status"
                  onChange={handleSelectChange}
                >
                  {RECORD_STATUSES.map((status) => (
                    <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.z0300_record_status === 'INACTIVE' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!isEditable}>
                  <InputLabel>Inactivation Reason</InputLabel>
                  <Select
                    name="z0300_inactivation_reason"
                    value={formData.z0300_inactivation_reason || ''}
                    label="Inactivation Reason"
                    onChange={handleSelectChange}
                  >
                    {INACTIVATION_REASONS.map((reason) => (
                      <MenuItem key={reason.value} value={reason.value}>{reason.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* SFV Tracking */}
      <Accordion
        expanded={expandedAccordion === 'sfv'}
        onChange={handleAccordionChange('sfv')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">SFV Tracking</Typography>
            {formData.sfv_triggered && (
              <Chip label="SFV Required" size="small" color="warning" />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="sfv_triggered"
                    checked={formData.sfv_triggered || false}
                    onChange={handleCheckboxChange}
                    disabled={!isEditable}
                  />
                }
                label="SFV Triggered"
              />
            </Grid>
            {formData.sfv_triggered && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Trigger Date"
                    name="sfv_trigger_date"
                    type="date"
                    value={formData.sfv_trigger_date ? formData.sfv_trigger_date.split('T')[0] : ''}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="SFV Due Date"
                    name="sfv_due_date"
                    type="date"
                    value={formData.sfv_due_date ? formData.sfv_due_date.split('T')[0] : ''}
                    onChange={handleInputChange}
                    InputLabelProps={{ shrink: true }}
                    disabled={!isEditable}
                    helperText="Within 48 hours of trigger"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Triggering Symptoms"
                    name="sfv_trigger_symptoms"
                    value={formData.sfv_trigger_symptoms || ''}
                    onChange={handleInputChange}
                    disabled={!isEditable}
                    helperText="Document symptoms that triggered the SFV requirement"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="sfv_completed"
                        checked={formData.sfv_completed || false}
                        onChange={handleCheckboxChange}
                        disabled={!isEditable}
                      />
                    }
                    label="SFV Completed"
                  />
                </Grid>
                {formData.sfv_completed && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="SFV Completed Date"
                      name="sfv_completed_date"
                      type="date"
                      value={formData.sfv_completed_date ? formData.sfv_completed_date.split('T')[0] : ''}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      disabled={!isEditable}
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Clinical Notes */}
      <Accordion
        expanded={expandedAccordion === 'notes'}
        onChange={handleAccordionChange('notes')}
      >
        <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
          <Typography variant="h6">Clinical Notes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Clinical Notes"
                name="clinical_notes"
                value={formData.clinical_notes || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Additional clinical observations and notes"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Plan of Care Updates"
                name="plan_of_care_updates"
                value={formData.plan_of_care_updates || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Recommended updates to the plan of care"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Interdisciplinary Notes"
                name="interdisciplinary_notes"
                value={formData.interdisciplinary_notes || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Notes for interdisciplinary team communication"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Family Conference Notes"
                name="family_conference_notes"
                value={formData.family_conference_notes || ''}
                onChange={handleInputChange}
                disabled={!isEditable}
                helperText="Notes from family meetings or discussions"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Audit Information */}
      {assessment && (
        <Accordion
          expanded={expandedAccordion === 'audit'}
          onChange={handleAccordionChange('audit')}
        >
          <AccordionSummary expandIcon={<ArrowDown2 size={18} />}>
            <Typography variant="h6">Audit Information</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body1">
                  {assessment.createdAt ? new Date(assessment.createdAt).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" color="text.secondary">Last Updated</Typography>
                <Typography variant="body1">
                  {assessment.updatedAt ? new Date(assessment.updatedAt).toLocaleString() : 'N/A'}
                </Typography>
              </Grid>
              {assessment.created_by_id && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Created By</Typography>
                  <Typography variant="body1">{assessment.created_by_id}</Typography>
                </Grid>
              )}
              {assessment.updated_by_id && (
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Last Updated By</Typography>
                  <Typography variant="body1">{assessment.updated_by_id}</Typography>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default SectionZ_RecordAdmin;
