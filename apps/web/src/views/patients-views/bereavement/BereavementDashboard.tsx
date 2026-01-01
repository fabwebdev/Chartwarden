import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  LinearProgress,
  Divider
} from '@mui/material';
import {
  EventNote as EventIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import {
  CaseSummary,
  BereavementFollowUp,
  getCaseSummary,
  getCaseFollowUps,
  formatMilestoneType,
  getStatusColor,
  getDaysUntilFollowUp
} from 'api/bereavement';

interface BereavementDashboardProps {
  caseId: number;
}

const BereavementDashboard: React.FC<BereavementDashboardProps> = ({ caseId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [followUps, setFollowUps] = useState<BereavementFollowUp[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryData, followUpsData] = await Promise.all([
        getCaseSummary(caseId),
        getCaseFollowUps(caseId)
      ]);
      setSummary(summaryData);
      setFollowUps(followUpsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
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

  const getUpcomingFollowUps = () => {
    return followUps
      .filter((f) => f.follow_up_status === 'SCHEDULED')
      .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
      .slice(0, 5);
  };

  const getOverdueCount = () => {
    return followUps.filter(
      (f) => f.follow_up_status === 'SCHEDULED' && getDaysUntilFollowUp(f.scheduled_date) < 0
    ).length;
  };

  const getDueSoonCount = () => {
    return followUps.filter(
      (f) =>
        f.follow_up_status === 'SCHEDULED' &&
        getDaysUntilFollowUp(f.scheduled_date) >= 0 &&
        getDaysUntilFollowUp(f.scheduled_date) <= 7
    ).length;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!summary) {
    return null;
  }

  const overdueCount = getOverdueCount();
  const dueSoonCount = getDueSoonCount();

  return (
    <Grid container spacing={3}>
      {/* Alerts */}
      {overdueCount > 0 && (
        <Grid item xs={12}>
          <Alert severity="error" icon={<WarningIcon />}>
            <strong>{overdueCount}</strong> follow-up(s) are overdue and require immediate attention.
          </Alert>
        </Grid>
      )}
      {dueSoonCount > 0 && (
        <Grid item xs={12}>
          <Alert severity="warning" icon={<ScheduleIcon />}>
            <strong>{dueSoonCount}</strong> follow-up(s) are due within the next 7 days.
          </Alert>
        </Grid>
      )}

      {/* Progress Card */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bereavement Period Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(summary.case.bereavement_start_date)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(summary.case.bereavement_end_date)}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={getProgressPercentage()}
                sx={{ height: 12, borderRadius: 6 }}
                color={summary.bereavement_progress.days_remaining < 30 ? 'warning' : 'primary'}
              />
              <Typography variant="body1" sx={{ mt: 1, textAlign: 'center' }}>
                <strong>{summary.bereavement_progress.days_remaining}</strong> days remaining
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {summary.statistics.total_contacts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Family Contacts
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {summary.statistics.total_encounters}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Encounters
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Follow-up Summary */}
      <Grid item xs={12} md={6}>
        <Card variant="outlined" sx={{ height: '100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Follow-Up Status
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={4}>
                <Card
                  variant="outlined"
                  sx={{ bgcolor: 'error.lighter', borderColor: 'error.light' }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h5" color="error.main">
                      {overdueCount}
                    </Typography>
                    <Typography variant="caption">Overdue</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card
                  variant="outlined"
                  sx={{ bgcolor: 'warning.lighter', borderColor: 'warning.light' }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h5" color="warning.main">
                      {followUps.filter((f) => f.follow_up_status === 'SCHEDULED').length}
                    </Typography>
                    <Typography variant="caption">Pending</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={4}>
                <Card
                  variant="outlined"
                  sx={{ bgcolor: 'success.lighter', borderColor: 'success.light' }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                    <Typography variant="h5" color="success.main">
                      {followUps.filter((f) => f.follow_up_status === 'COMPLETED').length}
                    </Typography>
                    <Typography variant="caption">Completed</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Upcoming Follow-ups
            </Typography>
            {getUpcomingFollowUps().length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No upcoming follow-ups scheduled
              </Typography>
            ) : (
              <List dense>
                {getUpcomingFollowUps().map((followUp) => {
                  const daysUntil = getDaysUntilFollowUp(followUp.scheduled_date);
                  const isOverdue = daysUntil < 0;

                  return (
                    <ListItem key={followUp.id}>
                      <ListItemIcon>
                        {isOverdue ? (
                          <WarningIcon color="error" />
                        ) : (
                          <EventIcon color={daysUntil <= 3 ? 'warning' : 'action'} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={formatMilestoneType(followUp.milestone_type)}
                        secondary={formatDate(followUp.scheduled_date)}
                      />
                      <Chip
                        size="small"
                        label={
                          isOverdue
                            ? `${Math.abs(daysUntil)}d overdue`
                            : daysUntil === 0
                            ? 'Today'
                            : `In ${daysUntil}d`
                        }
                        color={isOverdue ? 'error' : daysUntil <= 3 ? 'warning' : 'default'}
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Risk Assessment */}
      {summary.latest_risk_assessment && (
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Latest Risk Assessment
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Chip
                  size="medium"
                  label={`Risk Level: ${summary.latest_risk_assessment.risk_level}`}
                  color={getStatusColor(summary.latest_risk_assessment.risk_level || 'LOW')}
                />
                <Typography variant="body2" color="text.secondary">
                  Score: {summary.latest_risk_assessment.total_risk_score}/15
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Assessed on: {formatDate(summary.latest_risk_assessment.assessment_date)}
              </Typography>
              {summary.latest_risk_assessment.recommended_interventions && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Recommended Interventions:</Typography>
                  <Typography variant="body2">
                    {summary.latest_risk_assessment.recommended_interventions}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Case Notes */}
      {(summary.case.initial_assessment_notes ||
        summary.case.cultural_preferences ||
        summary.case.special_considerations) && (
        <Grid item xs={12} md={summary.latest_risk_assessment ? 6 : 12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Case Notes
              </Typography>
              {summary.case.initial_assessment_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Initial Assessment
                  </Typography>
                  <Typography variant="body2">{summary.case.initial_assessment_notes}</Typography>
                </Box>
              )}
              {summary.case.cultural_preferences && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Cultural Preferences
                  </Typography>
                  <Typography variant="body2">{summary.case.cultural_preferences}</Typography>
                </Box>
              )}
              {summary.case.special_considerations && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Special Considerations
                  </Typography>
                  <Typography variant="body2">{summary.case.special_considerations}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default BereavementDashboard;
