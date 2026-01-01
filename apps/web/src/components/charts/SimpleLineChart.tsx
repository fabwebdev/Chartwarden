'use client';

import { Box, Typography, Tooltip, useTheme, Paper } from '@mui/material';
import { useState, useRef } from 'react';

export interface LineChartDataPoint {
  label: string;
  value: number;
  secondary?: number;
}

interface SimpleLineChartProps {
  data: LineChartDataPoint[];
  height?: number;
  showGrid?: boolean;
  showArea?: boolean;
  showDots?: boolean;
  formatValue?: (value: number) => string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}

const SimpleLineChart = ({
  data,
  height = 200,
  showGrid = true,
  showArea = true,
  showDots = true,
  formatValue = (v) => v.toLocaleString(),
  primaryColor,
  secondaryColor,
  primaryLabel = 'Value',
  secondaryLabel = 'Secondary'
}: SimpleLineChartProps) => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const primary = primaryColor || theme.palette.primary.main;
  const secondary = secondaryColor || theme.palette.secondary.main;

  const allValues = data.flatMap(d => [d.value, d.secondary || 0]);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues.filter(v => v > 0), 0);

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 500;
  const chartHeight = height;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const xScale = (index: number) => padding.left + (index / Math.max(data.length - 1, 1)) * innerWidth;
  const yScale = (value: number) => {
    const range = maxValue - minValue || 1;
    return padding.top + innerHeight - ((value - minValue) / range) * innerHeight;
  };

  const createPath = (getValue: (d: LineChartDataPoint) => number) => {
    return data
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(getValue(d))}`)
      .join(' ');
  };

  const createAreaPath = (getValue: (d: LineChartDataPoint) => number) => {
    const linePath = createPath(getValue);
    return `${linePath} L ${xScale(data.length - 1)} ${padding.top + innerHeight} L ${xScale(0)} ${padding.top + innerHeight} Z`;
  };

  const hasSecondary = data.some(d => d.secondary !== undefined);

  // Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minValue + ((maxValue - minValue) / (yTicks - 1)) * i
  );

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Grid lines */}
        {showGrid && (
          <g>
            {yTickValues.map((tick, i) => (
              <line
                key={i}
                x1={padding.left}
                y1={yScale(tick)}
                x2={chartWidth - padding.right}
                y2={yScale(tick)}
                stroke={theme.palette.divider}
                strokeDasharray="4,4"
              />
            ))}
          </g>
        )}

        {/* Y-axis labels */}
        <g>
          {yTickValues.map((tick, i) => (
            <text
              key={i}
              x={padding.left - 10}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="10"
              fill={theme.palette.text.secondary}
            >
              {formatValue(tick)}
            </text>
          ))}
        </g>

        {/* X-axis labels */}
        <g>
          {data.map((d, i) => {
            // Only show every nth label to prevent overlap
            const showEvery = Math.ceil(data.length / 6);
            if (i % showEvery !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={xScale(i)}
                y={chartHeight - 10}
                textAnchor="middle"
                fontSize="10"
                fill={theme.palette.text.secondary}
              >
                {d.label}
              </text>
            );
          })}
        </g>

        {/* Area fills */}
        {showArea && (
          <>
            <path
              d={createAreaPath(d => d.value)}
              fill={primary}
              opacity={0.1}
            />
            {hasSecondary && (
              <path
                d={createAreaPath(d => d.secondary || 0)}
                fill={secondary}
                opacity={0.1}
              />
            )}
          </>
        )}

        {/* Lines */}
        <path
          d={createPath(d => d.value)}
          stroke={primary}
          strokeWidth={2}
          fill="none"
        />
        {hasSecondary && (
          <path
            d={createPath(d => d.secondary || 0)}
            stroke={secondary}
            strokeWidth={2}
            fill="none"
            strokeDasharray="4,4"
          />
        )}

        {/* Interactive dots */}
        {showDots && data.map((d, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)}
              cy={yScale(d.value)}
              r={activeIndex === i ? 6 : 4}
              fill={primary}
              stroke="white"
              strokeWidth={2}
              style={{ cursor: 'pointer', transition: 'r 0.2s' }}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            />
            {hasSecondary && d.secondary !== undefined && (
              <circle
                cx={xScale(i)}
                cy={yScale(d.secondary)}
                r={activeIndex === i ? 6 : 4}
                fill={secondary}
                stroke="white"
                strokeWidth={2}
                style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {activeIndex !== null && data[activeIndex] && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            p: 1,
            minWidth: 120,
            zIndex: 10
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {data[activeIndex].label}
          </Typography>
          <Typography variant="body2" sx={{ color: primary }}>
            {primaryLabel}: {formatValue(data[activeIndex].value)}
          </Typography>
          {hasSecondary && data[activeIndex].secondary !== undefined && (
            <Typography variant="body2" sx={{ color: secondary }}>
              {secondaryLabel}: {formatValue(data[activeIndex].secondary)}
            </Typography>
          )}
        </Paper>
      )}

      {/* Legend */}
      {hasSecondary && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 3, bgcolor: primary, borderRadius: 1 }} />
            <Typography variant="caption">{primaryLabel}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 3, bgcolor: secondary, borderRadius: 1, borderStyle: 'dashed' }} />
            <Typography variant="caption">{secondaryLabel}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SimpleLineChart;
