'use client';

import React, { useMemo } from 'react';

// Project Imports
import SimpleLineChart, { LineChartDataPoint } from 'components/charts/SimpleLineChart';

// Types
import type { MetricValue, MetricDefinition } from '../../../types/qapi';

interface MetricChartProps {
  data: MetricValue[];
  metricDefinition: MetricDefinition;
}

const MetricChart: React.FC<MetricChartProps> = ({ data, metricDefinition }) => {
  // Transform metric values to chart data points
  const chartData = useMemo<LineChartDataPoint[]>(() => {
    return data
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(value => ({
        time: new Date(value.recorded_at).getTime(),
        value: typeof value.value === 'number' ? value.value : parseFloat(String(value.value))
      }));
  }, [data]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <SimpleLineChart
      data={chartData}
      color={metricDefinition.category === 'CLINICAL' ? '#3b82f6' : '#10b981'}
      showTooltip={true}
    />
  );
};

export default MetricChart;
