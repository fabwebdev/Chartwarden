import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoFixHigh as GenerateIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import MainCard from 'components/MainCard';
import {
  BereavementFollowUp,
  BereavementContact,
  CreateFollowUpData,
  getCaseFollowUps,
  getCaseContacts,
  createFollowUp,
  updateFollowUp,
  generateStandardFollowUps,
  formatMilestoneType,
  formatContactMethod,
  getStatusColor,
  getDaysUntilFollowUp
} from 'api/bereavement';

interface FollowUpTrackerProps {
  caseId: number;
  canEdit: boolean;
  onRefresh?: () => void;
}

interface FollowUpFormData {
  milestone_type: string;
  scheduled_date: Date | null;
  bereavement_contact_id: string;
  contact_method: string;
  milestone_description: string;
}

interface CompleteFormData {
  completed_date: Date | null;
  contact_outcome: string;
  family_wellbeing_assessment: string;
  wellbeing_score: string;
  follow_up_notes: string;
  additional_support_needed: boolean;
  support_type_needed: string;
}

const initialFormData: FollowUpFormData = {
  milestone_type: '1_WEEK',
  scheduled_date: null,
  bereavement_contact_id: '',
  contact_method: 'PHONE_CALL',
  milestone_description: ''
};

const initialCompleteData: CompleteFormData = {
  completed_date: new Date(),
  contact_outcome: 'SUCCESSFUL',
  family_wellbeing_assessment: 'COPING_WELL',
  wellbeing_score: '5',
  follow_up_notes: '',
  additional_support_needed: false,
  support_type_needed: ''
};

const FollowUpTracker: React.FC<FollowUpTrackerProps> = ({
  caseId,
  canEdit,
  onRefresh
}) => {
  const [followUps, setFollowUps] = useState<BereavementFollowUp[]>([]);
  const [contacts, setContacts] = useState<BereavementContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<BereavementFollowUp | null>(null);
  const [formData, setFormData] = useState<FollowUpFormData>(initialFormData);
  const [completeData, setCompleteData] = useState<CompleteFormData>(initialCompleteData);
  const [saving, setSaving] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [followUpsData, contactsData] = await Promise.all([
        getCaseFollowUps(caseId),
        getCaseContacts(caseId)
      ]);
      setFollowUps(followUpsData);
      setContacts(contactsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setFormOpen(true);
  };

  const handleOpenComplete = (followUp: BereavementFollowUp) => {
    setSelectedFollowUp(followUp);
    setCompleteData(initialCompleteData);
    setCompleteOpen(true);
  };

  const handleChange = (field: keyof FollowUpFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCompleteChange = (field: keyof CompleteFormData, value: any) => {
    setCompleteData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.scheduled_date) {
      setError('Scheduled date is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const data: CreateFollowUpData = {
        milestone_type: formData.milestone_type as any,
        scheduled_date: formData.scheduled_date.toISOString().split('T')[0],
        bereavement_contact_id: formData.bereavement_contact_id ? Number(formData.bereavement_contact_id) : undefined,
        contact_method: formData.contact_method as any,
        milestone_description: formData.milestone_description || undefined
      };

      await createFollowUp(caseId, data);
      setFormOpen(false);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSubmit = async () => {
    if (!selectedFollowUp || !completeData.completed_date) return;

    try {
      setSaving(true);
      setError(null);

      await updateFollowUp(selectedFollowUp.id, {
        follow_up_status: 'COMPLETED',
        completed_date: completeData.completed_date.toISOString().split('T')[0],
        contact_outcome: completeData.contact_outcome as any,
        family_wellbeing_assessment: completeData.family_wellbeing_assessment as any,
        wellbeing_score: Number(completeData.wellbeing_score),
        follow_up_notes: completeData.follow_up_notes,
        additional_support_needed: completeData.additional_support_needed,
        support_type_needed: completeData.support_type_needed || undefined
      });

      setCompleteOpen(false);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete follow-up');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateStandard = async () => {
    try {
      setSaving(true);
      setError(null);
      await generateStandardFollowUps(caseId);
      fetchData();
      onRefresh?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate follow-ups');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const getStatusInfo = (followUp: BereavementFollowUp) => {
    if (followUp.follow_up_status === 'COMPLETED') {
      return { color: 'success' as const, icon: <CheckIcon />, label: 'Completed' };
    }

    const daysUntil = getDaysUntilFollowUp(followUp.scheduled_date);

    if (daysUntil < 0) {
      return { color: 'error' as const, icon: <WarningIcon />, label: `${Math.abs(daysUntil)} days overdue` };
    }
    if (daysUntil <= 3) {
      return { color: 'warning' as const, icon: <ScheduleIcon />, label: `Due in ${daysUntil} days` };
    }
    return { color: 'info' as const, icon: <ScheduleIcon />, label: `In ${daysUntil} days` };
  };

  const pendingFollowUps = followUps.filter((f) => f.follow_up_status === 'SCHEDULED');
  const completedFollowUps = followUps.filter((f) => f.follow_up_status === 'COMPLETED');
  const overdueFollowUps = pendingFollowUps.filter((f) => getDaysUntilFollowUp(f.scheduled_date) < 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <MainCard
        title="Follow-Up Schedule"
        secondary={
          canEdit && (
            <Box display="flex" gap={1}>
              {followUps.length === 0 && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<GenerateIcon />}
                  onClick={handleGenerateStandard}
                  disabled={saving}
                >
                  Generate Standard
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
              >
                Add Follow-Up
              </Button>
            </Box>
          )
        }
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" color="error.main">
                  {overdueFollowUps.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Overdue
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" color="warning.main">
                  {pendingFollowUps.length - overdueFollowUps.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scheduled
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h3" color="success.main">
                  {completedFollowUps.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {followUps.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary" gutterBottom>
              No follow-ups scheduled yet.
            </Typography>
            {canEdit && (
              <Box display="flex" gap={2} justifyContent="center" mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<GenerateIcon />}
                  onClick={handleGenerateStandard}
                >
                  Generate Standard Milestones
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreate}
                >
                  Add Custom Follow-Up
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell width={40}></TableCell>
                  <TableCell>Milestone</TableCell>
                  <TableCell>Scheduled Date</TableCell>
                  <TableCell>Contact Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {followUps.map((followUp) => {
                  const statusInfo = getStatusInfo(followUp);
                  const isExpanded = expandedRow === followUp.id;

                  return (
                    <React.Fragment key={followUp.id}>
                      <TableRow hover>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedRow(isExpanded ? null : followUp.id)}
                          >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatMilestoneType(followUp.milestone_type)}
                          </Typography>
                          {followUp.milestone_description && (
                            <Typography variant="caption" color="text.secondary">
                              {followUp.milestone_description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(followUp.scheduled_date)}</TableCell>
                        <TableCell>
                          {followUp.contact_method && formatContactMethod(followUp.contact_method)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            icon={statusInfo.icon}
                            label={statusInfo.label}
                            color={statusInfo.color}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {canEdit && followUp.follow_up_status === 'SCHEDULED' && (
                            <Tooltip title="Mark Complete">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleOpenComplete(followUp)}
                              >
                                <CheckIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ py: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, px: 4 }}>
                              <Grid container spacing={2}>
                                {followUp.follow_up_notes && (
                                  <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                      Notes
                                    </Typography>
                                    <Typography variant="body2">{followUp.follow_up_notes}</Typography>
                                  </Grid>
                                )}
                                {followUp.follow_up_status === 'COMPLETED' && (
                                  <>
                                    <Grid item xs={6} md={3}>
                                      <Typography variant="subtitle2" color="text.secondary">
                                        Completed Date
                                      </Typography>
                                      <Typography variant="body2">
                                        {formatDate(followUp.completed_date)}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6} md={3}>
                                      <Typography variant="subtitle2" color="text.secondary">
                                        Outcome
                                      </Typography>
                                      <Typography variant="body2">
                                        {followUp.contact_outcome?.replace(/_/g, ' ')}
                                      </Typography>
                                    </Grid>
                                    {followUp.family_wellbeing_assessment && (
                                      <Grid item xs={6} md={3}>
                                        <Typography variant="subtitle2" color="text.secondary">
                                          Wellbeing
                                        </Typography>
                                        <Chip
                                          size="small"
                                          label={followUp.family_wellbeing_assessment.replace(/_/g, ' ')}
                                          color={getStatusColor(followUp.family_wellbeing_assessment)}
                                        />
                                      </Grid>
                                    )}
                                    {followUp.additional_support_needed && (
                                      <Grid item xs={12}>
                                        <Alert severity="warning" sx={{ py: 0.5 }}>
                                          Additional support needed: {followUp.support_type_needed}
                                        </Alert>
                                      </Grid>
                                    )}
                                  </>
                                )}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MainCard>

      {/* Create Follow-Up Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule Follow-Up</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Milestone Type</InputLabel>
                <Select
                  value={formData.milestone_type}
                  label="Milestone Type"
                  onChange={(e) => handleChange('milestone_type', e.target.value)}
                >
                  <MenuItem value="1_WEEK">1 Week</MenuItem>
                  <MenuItem value="1_MONTH">1 Month</MenuItem>
                  <MenuItem value="3_MONTHS">3 Months</MenuItem>
                  <MenuItem value="6_MONTHS">6 Months</MenuItem>
                  <MenuItem value="1_YEAR">1 Year</MenuItem>
                  <MenuItem value="CUSTOM">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Scheduled Date *"
                  value={formData.scheduled_date}
                  onChange={(date) => handleChange('scheduled_date', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Contact Method</InputLabel>
                <Select
                  value={formData.contact_method}
                  label="Contact Method"
                  onChange={(e) => handleChange('contact_method', e.target.value)}
                >
                  <MenuItem value="PHONE_CALL">Phone Call</MenuItem>
                  <MenuItem value="HOME_VISIT">Home Visit</MenuItem>
                  <MenuItem value="LETTER">Letter</MenuItem>
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="SYMPATHY_CARD">Sympathy Card</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Contact Person</InputLabel>
                <Select
                  value={formData.bereavement_contact_id}
                  label="Contact Person"
                  onChange={(e) => handleChange('bereavement_contact_id', e.target.value)}
                >
                  <MenuItem value="">All Contacts</MenuItem>
                  {contacts.map((contact) => (
                    <MenuItem key={contact.id} value={contact.id.toString()}>
                      {contact.first_name} {contact.last_name}
                      {contact.is_primary_contact && ' (Primary)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {formData.milestone_type === 'CUSTOM' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Milestone Description"
                  value={formData.milestone_description}
                  onChange={(e) => handleChange('milestone_description', e.target.value)}
                  placeholder="Describe the custom milestone..."
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : null}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Follow-Up Dialog */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Complete Follow-Up</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Completed Date *"
                  value={completeData.completed_date}
                  onChange={(date) => handleCompleteChange('completed_date', date)}
                  maxDate={new Date()}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Contact Outcome</InputLabel>
                <Select
                  value={completeData.contact_outcome}
                  label="Contact Outcome"
                  onChange={(e) => handleCompleteChange('contact_outcome', e.target.value)}
                >
                  <MenuItem value="SUCCESSFUL">Successful</MenuItem>
                  <MenuItem value="NO_ANSWER">No Answer</MenuItem>
                  <MenuItem value="LEFT_MESSAGE">Left Message</MenuItem>
                  <MenuItem value="DECLINED">Declined</MenuItem>
                  <MenuItem value="OTHER">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Family Wellbeing</InputLabel>
                <Select
                  value={completeData.family_wellbeing_assessment}
                  label="Family Wellbeing"
                  onChange={(e) => handleCompleteChange('family_wellbeing_assessment', e.target.value)}
                >
                  <MenuItem value="COPING_WELL">Coping Well</MenuItem>
                  <MenuItem value="MILD_DISTRESS">Mild Distress</MenuItem>
                  <MenuItem value="MODERATE_DISTRESS">Moderate Distress</MenuItem>
                  <MenuItem value="SEVERE_DISTRESS">Severe Distress</MenuItem>
                  <MenuItem value="CRISIS">Crisis</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Wellbeing Score (1-10)"
                value={completeData.wellbeing_score}
                onChange={(e) => handleCompleteChange('wellbeing_score', e.target.value)}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Follow-Up Notes"
                value={completeData.follow_up_notes}
                onChange={(e) => handleCompleteChange('follow_up_notes', e.target.value)}
                placeholder="Document the conversation and any observations..."
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={completeData.additional_support_needed}
                    onChange={(e) => handleCompleteChange('additional_support_needed', e.target.checked)}
                  />
                }
                label="Additional support needed"
              />
            </Grid>
            {completeData.additional_support_needed && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Support Type Needed"
                  value={completeData.support_type_needed}
                  onChange={(e) => handleCompleteChange('support_type_needed', e.target.value)}
                  placeholder="Describe the support needed..."
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleCompleteSubmit}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            Mark Complete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FollowUpTracker;
