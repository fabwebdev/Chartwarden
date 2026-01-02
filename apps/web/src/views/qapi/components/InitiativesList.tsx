'use client';

import React, { useState } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

// Icons
import {
  Eye,
  Edit,
  Task,
  Calendar,
  Profile2User
} from 'iconsax-react';

// Project Imports
import InitiativeDetail from './InitiativeDetail';

// Types
import type { ImprovementInitiative, MetricDefinition, InitiativeStatus, InitiativePriority } from '../../../types/qapi';

interface InitiativesListProps {
  initiatives: ImprovementInitiative[];
  metricDefinitions: MetricDefinition[];
  onRefresh: () => void;
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

const InitiativesList: React.FC<InitiativesListProps> = ({
  initiatives,
  metricDefinitions,
  onRefresh
}) => {
  const [selectedInitiative, setSelectedInitiative] = useState<ImprovementInitiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handleViewDetails = (initiative: ImprovementInitiative) => {
    setSelectedInitiative(initiative);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedInitiative(null);
  };

  const handleInitiativeUpdated = () => {
    onRefresh();
  };

  // Group initiatives by status
  const activeInitiatives = initiatives.filter(i =>
    ['APPROVED', 'IN_PROGRESS'].includes(i.status)
  );
  const completedInitiatives = initiatives.filter(i => i.status === 'COMPLETED');
  const otherInitiatives = initiatives.filter(i =>
    !['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(i.status)
  );

  return (
    <Box>
      {/* Active Initiatives */}
      {activeInitiatives.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Task size={20} />
            <Typography variant="h5">Active Initiatives</Typography>
            <Chip label={activeInitiatives.length} size="small" color="primary" />
          </Stack>

          <Grid container spacing={3}>
            {activeInitiatives.map(initiative => (
              <Grid item xs={12} key={initiative.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <Typography variant="h6">{initiative.title}</Typography>
                            {initiative.code && (
                              <Chip label={initiative.code} size="small" variant="outlined" />
                            )}
                          </Stack>
                          {initiative.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {initiative.description}
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
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => handleViewDetails(initiative)}>
                              <Eye size={18} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Profile2User size={16} color="#64748b" />
                            <Typography variant="caption" color="text.secondary">
                              Owner: {initiative.owner_id || 'Unassigned'}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Calendar size={16} color="#64748b" />
                            <Typography variant="caption" color="text.secondary">
                              Start: {formatDate(initiative.planned_start_date)}
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Calendar size={16} color="#64748b" />
                            <Typography variant="caption" color="text.secondary">
                              Due: {formatDate(initiative.planned_end_date)}
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="caption" fontWeight="bold">
                            {initiative.progress_percentage}%
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={initiative.progress_percentage}
                          color={initiative.progress_percentage >= 80 ? 'success' : 'primary'}
                        />
                      </Box>

                      {initiative.milestones && initiative.milestones.length > 0 && (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          <Typography variant="caption" color="text.secondary">
                            Milestones:
                          </Typography>
                          {initiative.milestones.slice(0, 3).map((milestone, idx) => (
                            <Chip
                              key={idx}
                              label={milestone.name}
                              size="small"
                              variant="outlined"
                              color={milestone.status === 'COMPLETED' ? 'success' : 'default'}
                            />
                          ))}
                          {initiative.milestones.length > 3 && (
                            <Chip label={`+${initiative.milestones.length - 3} more`} size="small" />
                          )}
                        </Stack>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Completed Initiatives */}
      {completedInitiatives.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Task size={20} />
            <Typography variant="h5">Completed Initiatives</Typography>
            <Chip label={completedInitiatives.length} size="small" color="success" />
          </Stack>

          <Grid container spacing={3}>
            {completedInitiatives.slice(0, 3).map(initiative => (
              <Grid item xs={12} md={6} key={initiative.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6">{initiative.title}</Typography>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(initiative)}>
                            <Eye size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Chip
                        label="Completed"
                        color="success"
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Completed: {formatDate(initiative.actual_end_date)}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Other Initiatives */}
      {otherInitiatives.length > 0 && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Task size={20} />
            <Typography variant="h5">Other Initiatives</Typography>
            <Chip label={otherInitiatives.length} size="small" />
          </Stack>

          <Grid container spacing={3}>
            {otherInitiatives.map(initiative => (
              <Grid item xs={12} md={6} key={initiative.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6">{initiative.title}</Typography>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleViewDetails(initiative)}>
                            <Eye size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Chip
                        label={initiative.status.replace(/_/g, ' ')}
                        color={getStatusColor(initiative.status)}
                        size="small"
                        sx={{ alignSelf: 'flex-start' }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {initiatives.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No initiatives found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new improvement initiative to get started
          </Typography>
        </Box>
      )}

      {/* Initiative Detail Dialog */}
      {selectedInitiative && (
        <InitiativeDetail
          open={detailOpen}
          initiative={selectedInitiative}
          metricDefinitions={metricDefinitions}
          onClose={handleCloseDetail}
          onUpdate={handleInitiativeUpdated}
        />
      )}
    </Box>
  );
};

export default InitiativesList;
