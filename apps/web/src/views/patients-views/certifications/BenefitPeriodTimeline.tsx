import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Add as AddIcon
} from '@mui/icons-material';
import http from 'hooks/useCookie';
import { createBenefitPeriod } from 'api/patient';
import Swal from 'sweetalert2';

interface BenefitPeriod {
  id: number;
  period_number: number;
  period_type: string;
  start_date: string;
  end_date: string;
  level_of_care: string;
  location_name?: string;
  f2f_status?: string;
  election_status?: string;
  noe_filed?: boolean;
  billable_days?: number;
}

interface BenefitPeriodTimelineProps {
  patientId: string;
  onSelectPeriod?: (period: BenefitPeriod) => void;
  canCreate?: boolean;
}

const BenefitPeriodTimeline: React.FC<BenefitPeriodTimelineProps> = ({
  patientId,
  onSelectPeriod,
  canCreate = false
}) => {
  const [benefitPeriods, setBenefitPeriods] = useState<BenefitPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const fetchBenefitPeriods = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await http.get(`/benefit-periods/patients/${patientId}/chart`);
      const responseData = response.data || response;
      const periods = responseData.benefitPeriods || responseData.benefit_periods || [];
      setBenefitPeriods(Array.isArray(periods) ? periods : []);
    } catch (err: any) {
      console.error('Error fetching benefit periods:', err);
      setError(err.response?.data?.message || 'Failed to load benefit periods');
      setBenefitPeriods([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchBenefitPeriods();
  }, [fetchBenefitPeriods]);

  const handleCreateBenefitPeriod = async () => {
    if (!patientId) return;

    try {
      setCreating(true);
      await createBenefitPeriod(patientId);
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Benefit period created successfully!'
      });
      fetchBenefitPeriods();
    } catch (err: any) {
      console.error('Error creating benefit period:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to create benefit period'
      });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const getPeriodStatus = (period: BenefitPeriod) => {
    const now = new Date();
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);

    if (now < start) return { label: 'Upcoming', color: 'info' as const };
    if (now > end) return { label: 'Completed', color: 'default' as const };
    return { label: 'Active', color: 'success' as const };
  };

  const getLevelOfCareLabel = (loc?: string) => {
    const labels: Record<string, string> = {
      'RHC': 'Routine Home Care',
      'CHC': 'Continuous Home Care',
      'GIP': 'General Inpatient',
      'IRC': 'Inpatient Respite Care'
    };
    return labels[loc || ''] || loc || 'Unknown';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (benefitPeriods.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <ScheduleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No Benefit Periods
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Create a benefit period to track hospice coverage.
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateBenefitPeriod}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create Benefit Period'}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          Benefit Periods ({benefitPeriods.length})
        </Typography>
        {canCreate && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreateBenefitPeriod}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'New Period'}
          </Button>
        )}
      </Stack>

      <Timeline position="right" sx={{ px: 0, my: 0 }}>
        {benefitPeriods.map((period, index) => {
          const status = getPeriodStatus(period);
          const isExpanded = expandedPeriod === period.id;

          return (
            <TimelineItem key={period.id}>
              <TimelineOppositeContent sx={{ flex: 0.2, py: '12px' }}>
                <Typography variant="caption" color="text.secondary">
                  Period {period.period_number}
                </Typography>
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot
                  color={status.color === 'default' ? 'grey' : status.color}
                  variant={status.label === 'Active' ? 'filled' : 'outlined'}
                >
                  {status.label === 'Active' && <CheckIcon fontSize="small" />}
                  {status.label === 'Upcoming' && <ScheduleIcon fontSize="small" />}
                </TimelineDot>
                {index < benefitPeriods.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent sx={{ py: '12px', px: 2 }}>
                <Card
                  sx={{
                    cursor: onSelectPeriod ? 'pointer' : 'default',
                    '&:hover': onSelectPeriod ? { bgcolor: 'action.hover' } : {}
                  }}
                  onClick={() => onSelectPeriod?.(period)}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2">
                            {formatDate(period.start_date)} - {formatDate(period.end_date)}
                          </Typography>
                          <Chip label={status.label} size="small" color={status.color} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {getLevelOfCareLabel(period.level_of_care)}
                          {period.location_name && ` - ${period.location_name}`}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedPeriod(isExpanded ? null : period.id);
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </Stack>

                    <Collapse in={isExpanded}>
                      <Divider sx={{ my: 1.5 }} />
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            NOE Filed
                          </Typography>
                          <Typography variant="body2">
                            {period.noe_filed ? (
                              <Chip icon={<CheckIcon />} label="Yes" size="small" color="success" variant="outlined" />
                            ) : (
                              <Chip icon={<WarningIcon />} label="No" size="small" color="warning" variant="outlined" />
                            )}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            F2F Status
                          </Typography>
                          <Typography variant="body2">
                            {period.f2f_status || '-'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Election Status
                          </Typography>
                          <Typography variant="body2">
                            {period.election_status || 'Active'}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">
                            Billable Days
                          </Typography>
                          <Typography variant="body2">
                            {period.billable_days ?? '-'}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Collapse>
                  </CardContent>
                </Card>
              </TimelineContent>
            </TimelineItem>
          );
        })}
      </Timeline>
    </Box>
  );
};

export default BenefitPeriodTimeline;
