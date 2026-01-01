'use client';

import {
  Box,
  Grid,
  Typography,
  Stack,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip
} from '@mui/material';
import {
  TickCircle,
  Chart,
  Flag,
  Activity,
  TrendUp,
  TrendDown,
  Minus
} from 'iconsax-react';
import { useState, useMemo } from 'react';

import { Goal, Intervention, CarePlan } from '../../../api/carePlan';

// ==============================|| INTERFACES ||============================== //

interface ProgressTabProps {
  goals: Goal[];
  interventions: Intervention[];
  carePlan: CarePlan;
}

// ==============================|| CONSTANTS ||============================== //

const PROGRESS_LEVELS = [
  { value: 'NO_PROGRESS', label: 'No Progress', percent: 0 },
  { value: 'MINIMAL_PROGRESS', label: 'Minimal Progress', percent: 25 },
  { value: 'MODERATE_PROGRESS', label: 'Moderate Progress', percent: 50 },
  { value: 'SIGNIFICANT_PROGRESS', label: 'Significant Progress', percent: 75 },
  { value: 'GOAL_ACHIEVED', label: 'Goal Achieved', percent: 100 },
  { value: 'REGRESSION', label: 'Regression', percent: 0 }
];

// ==============================|| HELPERS ||============================== //

const getProgressPercent = (progressLevel: string | undefined): number => {
  const found = PROGRESS_LEVELS.find(p => p.value === progressLevel);
  return found?.percent || 0;
};

const getStatusColor = (status: string) => {
  const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    DRAFT: 'default',
    ACTIVE: 'success',
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    ACHIEVED: 'success',
    PARTIALLY_ACHIEVED: 'info',
    NOT_ACHIEVED: 'error',
    DISCONTINUED: 'default',
    PLANNED: 'default',
    COMPLETED: 'success',
    ON_HOLD: 'warning'
  };
  return statusColors[status] || 'default';
};

// ==============================|| PROGRESS TAB ||============================== //

const ProgressTab = ({ goals, interventions, carePlan }: ProgressTabProps) => {
  const [timeFilter, setTimeFilter] = useState<string>('all');

  // ==============================|| CALCULATIONS ||============================== //

  const statistics = useMemo(() => {
    // Goal statistics
    const totalGoals = goals.length;
    const activeGoals = goals.filter(g => g.goal_status === 'IN_PROGRESS' || g.goal_status === 'NOT_STARTED').length;
    const achievedGoals = goals.filter(g => g.goal_status === 'ACHIEVED').length;
    const partiallyAchievedGoals = goals.filter(g => g.goal_status === 'PARTIALLY_ACHIEVED').length;
    const discontinuedGoals = goals.filter(g => g.goal_status === 'DISCONTINUED').length;
    const notAchievedGoals = goals.filter(g => g.goal_status === 'NOT_ACHIEVED').length;

    // Goal achievement rate
    const completedGoals = achievedGoals + partiallyAchievedGoals;
    const goalAchievementRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    // Average goal progress
    const goalsWithProgress = goals.filter(g => g.progress_level);
    const totalProgress = goalsWithProgress.reduce((sum, g) => sum + getProgressPercent(g.progress_level), 0);
    const averageGoalProgress = goalsWithProgress.length > 0 ? Math.round(totalProgress / goalsWithProgress.length) : 0;

    // Intervention statistics
    const totalInterventions = interventions.length;
    const activeInterventions = interventions.filter(i => i.intervention_status === 'IN_PROGRESS' || i.intervention_status === 'PLANNED').length;
    const completedInterventions = interventions.filter(i => i.intervention_status === 'COMPLETED').length;
    const discontinuedInterventions = interventions.filter(i => i.intervention_status === 'DISCONTINUED').length;
    const onHoldInterventions = interventions.filter(i => i.intervention_status === 'ON_HOLD').length;

    // Total times performed
    const totalTimesPerformed = interventions.reduce((sum, i) => sum + (i.times_performed || 0), 0);

    // Effectiveness breakdown
    const effectiveInterventions = interventions.filter(i =>
      i.effectiveness_rating === 'VERY_EFFECTIVE' || i.effectiveness_rating === 'EFFECTIVE'
    ).length;
    const ratedInterventions = interventions.filter(i => i.effectiveness_rating).length;
    const effectivenessRate = ratedInterventions > 0 ? Math.round((effectiveInterventions / ratedInterventions) * 100) : 0;

    // Goals by discipline
    const goalsByDiscipline: Record<string, number> = {};
    goals.forEach(g => {
      if (g.primary_discipline) {
        goalsByDiscipline[g.primary_discipline] = (goalsByDiscipline[g.primary_discipline] || 0) + 1;
      }
    });

    // Interventions by category
    const interventionsByCategory: Record<string, number> = {};
    interventions.forEach(i => {
      interventionsByCategory[i.intervention_category] = (interventionsByCategory[i.intervention_category] || 0) + 1;
    });

    return {
      totalGoals,
      activeGoals,
      achievedGoals,
      partiallyAchievedGoals,
      discontinuedGoals,
      notAchievedGoals,
      goalAchievementRate,
      averageGoalProgress,
      totalInterventions,
      activeInterventions,
      completedInterventions,
      discontinuedInterventions,
      onHoldInterventions,
      totalTimesPerformed,
      effectivenessRate,
      goalsByDiscipline,
      interventionsByCategory
    };
  }, [goals, interventions]);

  // Filter goals based on time filter
  const filteredGoals = useMemo(() => {
    if (timeFilter === 'all') return goals;

    const now = new Date();
    const filterDays = parseInt(timeFilter);
    const cutoffDate = new Date(now.getTime() - filterDays * 24 * 60 * 60 * 1000);

    return goals.filter(g => {
      const updatedAt = new Date(g.updatedAt);
      return updatedAt >= cutoffDate;
    });
  }, [goals, timeFilter]);

  // ==============================|| RENDER ||============================== //

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Overall Progress Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Overall Goal Progress
                  </Typography>
                  <Chart size={24} color="#1976d2" />
                </Stack>
                <Box>
                  <Typography variant="h3">{statistics.averageGoalProgress}%</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={statistics.averageGoalProgress}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    color={statistics.averageGoalProgress >= 75 ? 'success' : statistics.averageGoalProgress >= 50 ? 'primary' : 'warning'}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Based on {goals.filter(g => g.progress_level).length} goals with progress tracking
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Goals Summary Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Goals Summary
                  </Typography>
                  <Flag size={24} color="#2e7d32" />
                </Stack>
                <Box>
                  <Typography variant="h3">
                    {statistics.achievedGoals}/{statistics.totalGoals}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Goals Achieved
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${statistics.activeGoals} Active`} size="small" color="primary" />
                  <Chip label={`${statistics.partiallyAchievedGoals} Partial`} size="small" color="info" />
                  {statistics.discontinuedGoals > 0 && (
                    <Chip label={`${statistics.discontinuedGoals} Disc.`} size="small" />
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Interventions Summary Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Interventions Summary
                  </Typography>
                  <Activity size={24} color="#9c27b0" />
                </Stack>
                <Box>
                  <Typography variant="h3">{statistics.totalTimesPerformed}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Performed
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip label={`${statistics.activeInterventions} Active`} size="small" color="primary" />
                  <Chip label={`${statistics.completedInterventions} Done`} size="small" color="success" />
                  {statistics.onHoldInterventions > 0 && (
                    <Chip label={`${statistics.onHoldInterventions} On Hold`} size="small" color="warning" />
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Effectiveness Card */}
        <Grid item xs={12} md={6} lg={3}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2" color="text.secondary">
                    Intervention Effectiveness
                  </Typography>
                  <TrendUp size={24} color="#4caf50" />
                </Stack>
                <Box>
                  <Typography variant="h3">{statistics.effectivenessRate}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rated Effective
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Based on {interventions.filter(i => i.effectiveness_rating).length} rated interventions
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Goals Progress Table */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">Goal Progress Tracking</Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Time Period</InputLabel>
              <Select
                value={timeFilter}
                label="Time Period"
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="90">Last 90 Days</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {filteredGoals.length === 0 ? (
            <Alert severity="info">No goals found for the selected time period.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Goal</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Target Date</TableCell>
                    <TableCell>Discipline</TableCell>
                    <TableCell>Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredGoals.map((goal) => {
                    const progressPercent = getProgressPercent(goal.progress_level);
                    const isOverdue = goal.target_date && new Date(goal.target_date) < new Date() && goal.goal_status !== 'ACHIEVED';

                    return (
                      <TableRow key={goal.id}>
                        <TableCell>
                          <Tooltip title={goal.goal_description}>
                            <Typography variant="body2" sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {goal.goal_description}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={goal.goal_status.replace('_', ' ')}
                            size="small"
                            color={getStatusColor(goal.goal_status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack spacing={0.5} sx={{ minWidth: 100 }}>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption">{progressPercent}%</Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{ height: 6, borderRadius: 3 }}
                              color={progressPercent >= 100 ? 'success' : progressPercent >= 50 ? 'primary' : 'warning'}
                            />
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {goal.target_date ? (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography
                                variant="body2"
                                color={isOverdue ? 'error' : 'text.secondary'}
                              >
                                {new Date(goal.target_date).toLocaleDateString()}
                              </Typography>
                              {isOverdue && (
                                <Chip label="Overdue" size="small" color="error" />
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">-</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{goal.primary_discipline || '-'}</Typography>
                        </TableCell>
                        <TableCell>
                          {goal.progress_level === 'REGRESSION' ? (
                            <TrendDown size={18} color="#f44336" />
                          ) : goal.progress_level === 'GOAL_ACHIEVED' ? (
                            <TickCircle size={18} color="#4caf50" />
                          ) : progressPercent >= 50 ? (
                            <TrendUp size={18} color="#4caf50" />
                          ) : progressPercent > 0 ? (
                            <Minus size={18} color="#ff9800" />
                          ) : (
                            <Minus size={18} color="#9e9e9e" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Intervention Activity Table */}
      <Card variant="outlined" sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Intervention Activity</Typography>

          {interventions.length === 0 ? (
            <Alert severity="info">No interventions have been added yet.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Intervention</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Times Performed</TableCell>
                    <TableCell>Last Performed</TableCell>
                    <TableCell>Effectiveness</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {interventions.slice(0, 10).map((intervention) => (
                    <TableRow key={intervention.id}>
                      <TableCell>
                        <Tooltip title={intervention.intervention_description}>
                          <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {intervention.intervention_description}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={intervention.intervention_category.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={intervention.intervention_status.replace('_', ' ')}
                          size="small"
                          color={getStatusColor(intervention.intervention_status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {intervention.times_performed || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {intervention.last_performed_date
                            ? new Date(intervention.last_performed_date).toLocaleDateString()
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {intervention.effectiveness_rating ? (
                          <Chip
                            label={intervention.effectiveness_rating.replace('_', ' ')}
                            size="small"
                            color={
                              intervention.effectiveness_rating === 'VERY_EFFECTIVE' || intervention.effectiveness_rating === 'EFFECTIVE'
                                ? 'success'
                                : intervention.effectiveness_rating === 'SOMEWHAT_EFFECTIVE'
                                  ? 'warning'
                                  : 'error'
                            }
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">Not rated</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {interventions.length > 10 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Showing first 10 of {interventions.length} interventions
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Distribution Charts (Simple) */}
      <Grid container spacing={3}>
        {/* Goals by Discipline */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Goals by Discipline</Typography>
              {Object.keys(statistics.goalsByDiscipline).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No discipline data available</Typography>
              ) : (
                <Stack spacing={1}>
                  {Object.entries(statistics.goalsByDiscipline).map(([discipline, count]) => (
                    <Box key={discipline}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="body2">{discipline}</Typography>
                        <Typography variant="body2" fontWeight={500}>{count as number}</Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={((count as number) / statistics.totalGoals) * 100}
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Interventions by Category */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Interventions by Category</Typography>
              {Object.keys(statistics.interventionsByCategory).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No category data available</Typography>
              ) : (
                <Stack spacing={1}>
                  {Object.entries(statistics.interventionsByCategory)
                    .sort((a, b) => (b[1] as number) - (a[1] as number))
                    .slice(0, 6)
                    .map(([category, count]) => (
                      <Box key={category}>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="body2">{category.replace('_', ' ')}</Typography>
                          <Typography variant="body2" fontWeight={500}>{count as number}</Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={((count as number) / statistics.totalInterventions) * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                          color="secondary"
                        />
                      </Box>
                    ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Care Plan Info */}
      <Card variant="outlined" sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>Care Plan Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="body1">{carePlan.care_plan_status}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Version</Typography>
              <Typography variant="body1">v{carePlan.version}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Effective Date</Typography>
              <Typography variant="body1">
                {carePlan.effective_date ? new Date(carePlan.effective_date).toLocaleDateString() : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Next Review</Typography>
              <Typography variant="body1">
                {carePlan.next_review_date ? new Date(carePlan.next_review_date).toLocaleDateString() : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Created</Typography>
              <Typography variant="body1">
                {new Date(carePlan.createdAt).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Last Updated</Typography>
              <Typography variant="body1">
                {new Date(carePlan.updatedAt).toLocaleDateString()}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">RN Signature</Typography>
              <Typography variant="body1">
                {carePlan.rn_signature ? (
                  <Chip label="Signed" size="small" color="success" icon={<TickCircle size={14} />} />
                ) : (
                  <Chip label="Pending" size="small" color="warning" />
                )}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">Physician Signature</Typography>
              <Typography variant="body1">
                {carePlan.physician_signature ? (
                  <Chip label="Signed" size="small" color="success" icon={<TickCircle size={14} />} />
                ) : (
                  <Chip label="Pending" size="small" color="warning" />
                )}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProgressTab;
