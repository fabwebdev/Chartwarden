'use client';

import React, { useMemo } from 'react';

// MUI Components
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';

// Icons
import {
  TrendUp,
  TrendDown,
  Minus,
  Chart,
  Warning2,
  TickCircle
} from 'iconsax-react';

// Project Imports
import MetricChart from './MetricChart';

// Types
import type {
  MetricDefinition,
  MetricValue,
  MetricAggregation,
  ThresholdStatus
} from '../../../types/qapi';

interface MetricsOverviewProps {
  metricDefinitions: MetricDefinition[];
  metricValues: MetricValue[];
  metricAggregations: MetricAggregation[];
  onRefresh: () => void;
}

// Helper function to get status color
const getStatusColor = (status?: ThresholdStatus): 'success' | 'warning' | 'error' | 'default' => {
  switch (status) {
    case 'OK':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'CRITICAL':
    case 'SLA_BREACH':
      return 'error';
    default:
      return 'default';
  }
};

// Helper function to get trend icon
const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case 'IMPROVING':
      return <TrendUp size={16} />;
    case 'DECLINING':
      return <TrendDown size={16} />;
    default:
      return <Minus size={16} />;
  }
};

const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metricDefinitions,
  metricValues,
  metricAggregations
}) => {
  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalMetrics = metricDefinitions.length;
    const activeMetrics = metricDefinitions.filter(m => m.is_active).length;

    const metricsWithValues = new Set(metricValues.map(v => v.metric_definition_id));
    const metricsReporting = metricsWithValues.size;

    const okCount = metricValues.filter(v => v.threshold_status === 'OK').length;
    const warningCount = metricValues.filter(v => v.threshold_status === 'WARNING').length;
    const criticalCount = metricValues.filter(v => v.threshold_status === 'CRITICAL' || v.threshold_status === 'SLA_BREACH').length;

    return {
      totalMetrics,
      activeMetrics,
      metricsReporting,
      okCount,
      warningCount,
      criticalCount,
      healthScore: totalMetrics > 0 ? Math.round((okCount / Math.max(metricValues.length, 1)) * 100) : 0
    };
  }, [metricDefinitions, metricValues]);

  // Group metrics by category
  const metricsByCategory = useMemo(() => {
    const grouped: Record<string, MetricDefinition[]> = {};
    metricDefinitions.forEach(metric => {
      if (!grouped[metric.category]) {
        grouped[metric.category] = [];
      }
      grouped[metric.category].push(metric);
    });
    return grouped;
  }, [metricDefinitions]);

  // Get latest value for each metric
  const getLatestValue = (metricId: number): MetricValue | undefined => {
    const values = metricValues.filter(v => v.metric_definition_id === metricId);
    if (values.length === 0) return undefined;
    return values.reduce((latest, current) =>
      new Date(current.recorded_at) > new Date(latest.recorded_at) ? current : latest
    );
  };

  // Get aggregation for metric
  const getAggregation = (metricId: number): MetricAggregation | undefined => {
    return metricAggregations.find(a => a.metric_definition_id === metricId);
  };

  return (
    <Box>
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Total Metrics
                </Typography>
                <Typography variant="h3">{summaryMetrics.totalMetrics}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {summaryMetrics.activeMetrics} active
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Health Score
                </Typography>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h3">{summaryMetrics.healthScore}%</Typography>
                  {summaryMetrics.healthScore >= 90 && <TickCircle size={24} color="#22c55e" />}
                  {summaryMetrics.healthScore < 70 && <Warning2 size={24} color="#ef4444" />}
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={summaryMetrics.healthScore}
                  color={summaryMetrics.healthScore >= 90 ? 'success' : summaryMetrics.healthScore >= 70 ? 'warning' : 'error'}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Status Distribution
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip
                    icon={<TickCircle size={16} />}
                    label={`${summaryMetrics.okCount} OK`}
                    color="success"
                    size="small"
                  />
                  <Chip
                    icon={<Warning2 size={16} />}
                    label={`${summaryMetrics.warningCount} Warning`}
                    color="warning"
                    size="small"
                  />
                  <Chip
                    icon={<Warning2 size={16} />}
                    label={`${summaryMetrics.criticalCount} Critical`}
                    color="error"
                    size="small"
                  />
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                  Reporting Metrics
                </Typography>
                <Typography variant="h3">{summaryMetrics.metricsReporting}</Typography>
                <Typography variant="caption" color="text.secondary">
                  of {summaryMetrics.activeMetrics} active metrics
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Metrics by Category */}
      {Object.entries(metricsByCategory).map(([category, metrics]) => (
        <Box key={category} sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <Chart size={20} />
            <Typography variant="h5">{category.replace(/_/g, ' ')}</Typography>
            <Chip label={metrics.length} size="small" />
          </Stack>

          <Grid container spacing={3}>
            {metrics.slice(0, 6).map(metric => {
              const latestValue = getLatestValue(metric.id);
              const aggregation = getAggregation(metric.id);
              const values = metricValues
                .filter(v => v.metric_definition_id === metric.id)
                .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

              return (
                <Grid item xs={12} md={6} key={metric.id}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6">{metric.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {metric.code}
                            </Typography>
                          </Box>
                          {latestValue?.threshold_status && (
                            <Chip
                              label={latestValue.threshold_status}
                              color={getStatusColor(latestValue.threshold_status)}
                              size="small"
                            />
                          )}
                        </Stack>

                        {latestValue && (
                          <Stack direction="row" alignItems="baseline" spacing={1}>
                            <Typography variant="h4">
                              {typeof latestValue.value === 'number'
                                ? latestValue.value.toFixed(metric.precision_digits || 2)
                                : latestValue.value}
                            </Typography>
                            {metric.unit && (
                              <Typography variant="body2" color="text.secondary">
                                {metric.unit}
                              </Typography>
                            )}
                          </Stack>
                        )}

                        {aggregation && (
                          <Stack direction="row" alignItems="center" spacing={1}>
                            {getTrendIcon(aggregation.trend_direction)}
                            <Typography variant="caption" color="text.secondary">
                              {aggregation.period_over_period_change
                                ? `${Number(aggregation.period_over_period_change) > 0 ? '+' : ''}${Number(aggregation.period_over_period_change).toFixed(1)}%`
                                : 'No change'}
                            </Typography>
                          </Stack>
                        )}

                        {values.length > 0 && (
                          <Box sx={{ height: 100 }}>
                            <MetricChart
                              data={values}
                              metricDefinition={metric}
                            />
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      {metricDefinitions.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No metrics available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create metric definitions to start tracking quality metrics
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MetricsOverview;
