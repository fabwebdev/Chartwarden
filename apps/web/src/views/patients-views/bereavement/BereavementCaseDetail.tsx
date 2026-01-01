import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Chip,
  Divider,
  Box,
  Tab,
  Tabs,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  BereavementCase,
  BereavementContact,
  BereavementFollowUp,
  CaseSummary,
  getCaseSummary,
  getCaseContacts,
  getCaseFollowUps,
  formatCaseStatus,
  formatServiceLevel,
  formatMilestoneType,
  formatContactMethod,
  formatRelationship,
  getStatusColor,
  getDaysUntilFollowUp
} from 'api/bereavement';

interface BereavementCaseDetailProps {
  open: boolean;
  onClose: () => void;
  caseId: number | null;
  onRefresh?: () => void;
  canEdit?: boolean;
  onEdit?: (bereavementCase: BereavementCase) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
};

const BereavementCaseDetail: React.FC<BereavementCaseDetailProps> = ({
  open,
  onClose,
  caseId,
  onRefresh,
  canEdit,
  onEdit
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [contacts, setContacts] = useState<BereavementContact[]>([]);
  const [followUps, setFollowUps] = useState<BereavementFollowUp[]>([]);

  const fetchData = useCallback(async () => {
    if (!caseId) return;

    try {
      setLoading(true);
      setError(null);

      const [summaryData, contactsData, followUpsData] = await Promise.all([
        getCaseSummary(caseId),
        getCaseContacts(caseId),
        getCaseFollowUps(caseId)
      ]);

      setSummary(summaryData);
      setContacts(contactsData);
      setFollowUps(followUpsData);
    } catch (err: any) {
      console.error('Error fetching case details:', err);
      setError(err.response?.data?.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (open && caseId) {
      fetchData();
      setTabValue(0);
    }
  }, [open, caseId, fetchData]);

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getProgressPercentage = () => {
    if (!summary?.bereavement_progress) return 0;
    const { start_date, end_date } = summary.bereavement_progress;
    const start = new Date(start_date).getTime();
    const end = new Date(end_date).getTime();
    const now = new Date().getTime();
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getPendingFollowUps = () => {
    return followUps.filter(
      (f) => f.follow_up_status === 'SCHEDULED' && getDaysUntilFollowUp(f.scheduled_date) <= 7
    );
  };

  const getOverdueFollowUps = () => {
    return followUps.filter(
      (f) => f.follow_up_status === 'SCHEDULED' && getDaysUntilFollowUp(f.scheduled_date) < 0
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5">
            Bereavement Case Details
          </Typography>
          <Box>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchData} size="small" sx={{ mr: 1 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : summary ? (
          <>
            {/* Header Summary */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Patient
                    </Typography>
                    <Typography variant="h6">
                      {summary.patient?.first_name} {summary.patient?.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Date of Death: {formatDate(summary.case.date_of_death)}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        size="small"
                        label={formatCaseStatus(summary.case.case_status)}
                        color={getStatusColor(summary.case.case_status)}
                        sx={{ mr: 1 }}
                      />
                      {summary.case.service_level && (
                        <Chip
                          size="small"
                          label={formatServiceLevel(summary.case.service_level)}
                          color={getStatusColor(summary.case.service_level)}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Bereavement Period Progress
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={getProgressPercentage()}
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Typography variant="body2">
                      {summary.bereavement_progress.days_remaining} days remaining
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(summary.case.bereavement_start_date)} - {formatDate(summary.case.bereavement_end_date)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Statistics
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="h4">{summary.statistics.total_contacts}</Typography>
                        <Typography variant="caption">Contacts</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h4">{summary.statistics.total_encounters}</Typography>
                        <Typography variant="caption">Encounters</Typography>
                      </Grid>
                    </Grid>
                    {summary.latest_risk_assessment && (
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          icon={<WarningIcon />}
                          label={`Risk: ${summary.latest_risk_assessment.risk_level}`}
                          color={getStatusColor(summary.latest_risk_assessment.risk_level || 'LOW')}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Alerts */}
            {getOverdueFollowUps().length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {getOverdueFollowUps().length} overdue follow-up(s) require attention.
              </Alert>
            )}
            {getPendingFollowUps().length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {getPendingFollowUps().length} follow-up(s) due within the next 7 days.
              </Alert>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Overview" />
                <Tab label={`Contacts (${contacts.length})`} />
                <Tab label={`Follow-ups (${followUps.length})`} />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Case Information
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <AssignmentIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Assigned Counselor"
                        secondary={summary.assigned_counselor?.name || 'Not assigned'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ScheduleIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="Case Created"
                        secondary={formatDate(summary.case.createdAt)}
                      />
                    </ListItem>
                  </List>

                  {summary.case.initial_assessment_notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Initial Assessment Notes
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {summary.case.initial_assessment_notes}
                      </Typography>
                    </Box>
                  )}

                  {summary.case.cultural_preferences && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Cultural Preferences
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {summary.case.cultural_preferences}
                      </Typography>
                    </Box>
                  )}

                  {summary.case.special_considerations && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Special Considerations
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {summary.case.special_considerations}
                      </Typography>
                    </Box>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                    Follow-up Summary
                  </Typography>
                  <List dense>
                    {Object.entries(summary.statistics.follow_ups).map(([status, count]) => (
                      <ListItem key={status}>
                        <ListItemIcon>
                          {status === 'completed' ? <CheckIcon color="success" /> : <ScheduleIcon />}
                        </ListItemIcon>
                        <ListItemText
                          primary={status.charAt(0).toUpperCase() + status.slice(1)}
                          secondary={`${count} follow-up(s)`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {contacts.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No contacts added yet.
                </Typography>
              ) : (
                <List>
                  {contacts.map((contact) => (
                    <React.Fragment key={contact.id}>
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              {contact.first_name} {contact.last_name}
                              {contact.is_primary_contact && (
                                <Chip size="small" label="Primary" color="primary" />
                              )}
                              {contact.relationship_to_deceased && (
                                <Chip
                                  size="small"
                                  label={formatRelationship(contact.relationship_to_deceased)}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box display="flex" gap={2} sx={{ mt: 0.5 }}>
                              {contact.phone && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <PhoneIcon fontSize="small" />
                                  <Typography variant="caption">{contact.phone}</Typography>
                                </Box>
                              )}
                              {contact.email && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <EmailIcon fontSize="small" />
                                  <Typography variant="caption">{contact.email}</Typography>
                                </Box>
                              )}
                              {contact.preferred_contact_method && (
                                <Typography variant="caption" color="text.secondary">
                                  Prefers: {formatContactMethod(contact.preferred_contact_method)}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        {contact.consent_status && (
                          <Chip
                            size="small"
                            label={contact.consent_status}
                            color={getStatusColor(contact.consent_status)}
                          />
                        )}
                      </ListItem>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              {followUps.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No follow-ups scheduled yet.
                </Typography>
              ) : (
                <List>
                  {followUps.map((followUp) => {
                    const daysUntil = getDaysUntilFollowUp(followUp.scheduled_date);
                    const isOverdue = daysUntil < 0 && followUp.follow_up_status === 'SCHEDULED';
                    const isDueSoon = daysUntil >= 0 && daysUntil <= 3 && followUp.follow_up_status === 'SCHEDULED';

                    return (
                      <React.Fragment key={followUp.id}>
                        <ListItem>
                          <ListItemIcon>
                            <ScheduleIcon color={isOverdue ? 'error' : isDueSoon ? 'warning' : 'inherit'} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                {formatMilestoneType(followUp.milestone_type)}
                                <Chip
                                  size="small"
                                  label={followUp.follow_up_status}
                                  color={getStatusColor(followUp.follow_up_status)}
                                />
                                {isOverdue && (
                                  <Chip size="small" label="Overdue" color="error" />
                                )}
                                {isDueSoon && (
                                  <Chip size="small" label="Due Soon" color="warning" />
                                )}
                              </Box>
                            }
                            secondary={
                              <>
                                Scheduled: {formatDate(followUp.scheduled_date)}
                                {followUp.contact_method && ` | ${formatContactMethod(followUp.contact_method)}`}
                                {followUp.completed_date && ` | Completed: ${formatDate(followUp.completed_date)}`}
                              </>
                            }
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </TabPanel>
          </>
        ) : null}
      </DialogContent>
      <DialogActions>
        {canEdit && summary && onEdit && summary.case.case_status === 'ACTIVE' && (
          <Button onClick={() => onEdit(summary.case)}>Edit Case</Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default BereavementCaseDetail;
