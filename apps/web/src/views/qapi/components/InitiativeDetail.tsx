'use client';

import React, { useState, useEffect } from 'react';

// MUI Components
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Icons
import {
  Calendar,
  Profile2User,
  DocumentText,
  Task,
  Chart,
  CloseCircle
} from 'iconsax-react';

// API
import {
  getInitiativeSnapshots,
  updateInitiative
} from '../../../api/qapi';

// Types
import type {
  ImprovementInitiative,
  MetricDefinition,
  MetricSnapshot,
  InitiativeStatus,
  InitiativePriority
} from '../../../types/qapi';

interface InitiativeDetailProps {
  open: boolean;
  initiative: ImprovementInitiative;
  metricDefinitions: MetricDefinition[];
  onClose: () => void;
  onUpdate: () => void;
}

// Helper function to get status color
const getStatusColor = (status: InitiativeStatus): 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' => {
  switch (status) {
    case 'PROPOSED':
      return 'default';
    case 'APPROVED':
      return 'primary';
    case 'IN_PROGRESS':
      return 'secondary';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    case 'ON_HOLD':
      return 'warning';
    default:
      return 'default';
  }
};

// Helper function to get priority color
const getPriorityColor = (priority: InitiativePriority): 'default' | 'error' | 'warning' | 'info' => {
  switch (priority) {
    case 'CRITICAL':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
    default:
      return 'default';
  }
};

// Format date helper
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const InitiativeDetail: React.FC<InitiativeDetailProps> = ({
  open,
  initiative,
  metricDefinitions,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<MetricSnapshot[]>([]);

  // Fetch initiative snapshots
  useEffect(() => {
    const fetchSnapshots = async () => {
      if (!open) return;

      try {
        setLoading(true);
        const response = await getInitiativeSnapshots(initiative.id);
        setSnapshots(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching initiative snapshots:', err);
        setError('Failed to load metric snapshots');
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshots();
  }, [open, initiative.id]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h4">{initiative.title}</Typography>
            {initiative.code && (
              <Typography variant="caption" color="text.secondary">
                {initiative.code}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Chip
              label={initiative.status.replace(/_/g, ' ')}
              color={getStatusColor(initiative.status)}
              size="small"
            />
            <Chip
              label={initiative.priority}
              color={getPriorityColor(initiative.priority)}
              size="small"
            />
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={3}>
          {/* Description */}
          {initiative.description && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Description
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.description}
              </Typography>
            </Box>
          )}

          {/* Key Info Grid */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Profile2User size={18} color="#64748b" />
                  <Typography variant="caption" color="text.secondary">
                    Owner: {initiative.owner_id || 'Unassigned'}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Calendar size={18} color="#64748b" />
                  <Typography variant="caption" color="text.secondary">
                    Start: {formatDate(initiative.planned_start_date)}
                  </Typography>
                </Stack>
                {initiative.team && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Profile2User size={18} color="#64748b" />
                    <Typography variant="caption" color="text.secondary">
                      Team: {initiative.team}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={2}>
                {initiative.sponsor_id && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Profile2User size={18} color="#64748b" />
                    <Typography variant="caption" color="text.secondary">
                      Sponsor: {initiative.sponsor_id}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Calendar size={18} color="#64748b" />
                  <Typography variant="caption" color="text.secondary">
                    Due: {formatDate(initiative.planned_end_date)}
                  </Typography>
                </Stack>
                {initiative.department && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DocumentText size={18} color="#64748b" />
                    <Typography variant="caption" color="text.secondary">
                      Department: {initiative.department}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Grid>
          </Grid>

          {/* Progress */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Progress
            </Typography>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {initiative.progress_percentage}% Complete
              </Typography>
              {initiative.actual_start_date && (
                <Typography variant="caption" color="text.secondary">
                  Started: {formatDate(initiative.actual_start_date)}
                </Typography>
              )}
            </Stack>
            <LinearProgress
              variant="determinate"
              value={initiative.progress_percentage}
              color={initiative.progress_percentage >= 80 ? 'success' : 'primary'}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          {/* Milestones */}
          {initiative.milestones && initiative.milestones.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Task size={18} />
                  <span>Milestones</span>
                </Stack>
              </Typography>
              <Stack spacing={1}>
                {initiative.milestones.map((milestone, idx) => (
                  <Stack key={idx} direction="row" spacing={2} alignItems="center">
                    <Chip
                      label={milestone.status}
                      size="small"
                      color={milestone.status === 'COMPLETED' ? 'success' : 'default'}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {milestone.name}
                    </Typography>
                    {milestone.due_date && (
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(milestone.due_date)}
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Objectives */}
          {initiative.objectives && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Objectives
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.objectives}
              </Typography>
            </Box>
          )}

          {/* Success Criteria */}
          {initiative.success_criteria && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Success Criteria
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.success_criteria}
              </Typography>
            </Box>
          )}

          {/* Expected Impact */}
          {initiative.expected_impact && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Expected Impact
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.expected_impact}
              </Typography>
            </Box>
          )}

          {/* Metric Snapshots */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : snapshots.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Chart size={18} />
                  <span>Metric Snapshots</span>
                </Stack>
              </Typography>
              <Stack spacing={1}>
                {snapshots.map((snapshot) => {
                  const metric = metricDefinitions.find(m => m.id === snapshot.metric_definition_id);
                  return (
                    <Box key={snapshot.id} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {metric?.name || 'Unknown Metric'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {snapshot.snapshot_type} - {formatDate(snapshot.snapshot_date)}
                          </Typography>
                        </Box>
                        <Stack alignItems="flex-end">
                          <Typography variant="h6">
                            {typeof snapshot.value === 'number' ? snapshot.value.toFixed(2) : snapshot.value}
                          </Typography>
                          {snapshot.percentage_change && (
                            <Typography variant="caption" color={Number(snapshot.percentage_change) >= 0 ? 'success.main' : 'error.main'}>
                              {Number(snapshot.percentage_change) > 0 ? '+' : ''}{Number(snapshot.percentage_change).toFixed(1)}%
                            </Typography>
                          )}
                        </Stack>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          ) : null}

          {/* Outcomes (for completed initiatives) */}
          {initiative.status === 'COMPLETED' && initiative.outcomes && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Outcomes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.outcomes}
              </Typography>
            </Box>
          )}

          {/* Lessons Learned */}
          {initiative.lessons_learned && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Lessons Learned
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {initiative.lessons_learned}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InitiativeDetail;
