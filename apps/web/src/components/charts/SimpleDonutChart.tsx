'use client';

import { Box, Typography, useTheme } from '@mui/material';
import { useState } from 'react';

export interface DonutChartSegment {
  label: string;
  value: number;
  color?: string;
}

interface SimpleDonutChartProps {
  data: DonutChartSegment[];
  size?: number;
  thickness?: number;
  showLegend?: boolean;
  showCenter?: boolean;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}

const SimpleDonutChart = ({
  data,
  size = 200,
  thickness = 40,
  showLegend = true,
  showCenter = true,
  centerLabel,
  centerValue,
  formatValue = (v) => v.toLocaleString()
}: SimpleDonutChartProps) => {
  const theme = useTheme();
  const [activeSegment, setActiveSegment] = useState<number | null>(null);

  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    '#9c27b0',
    '#00bcd4',
    '#ff9800',
    '#607d8b'
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2;
  const innerRadius = radius - thickness;

  // Calculate segments
  let currentAngle = -90; // Start from top
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    // Calculate arc path
    const startRadians = (startAngle * Math.PI) / 180;
    const endRadians = (endAngle * Math.PI) / 180;

    const x1 = radius + radius * Math.cos(startRadians);
    const y1 = radius + radius * Math.sin(startRadians);
    const x2 = radius + radius * Math.cos(endRadians);
    const y2 = radius + radius * Math.sin(endRadians);

    const ix1 = radius + innerRadius * Math.cos(startRadians);
    const iy1 = radius + innerRadius * Math.sin(startRadians);
    const ix2 = radius + innerRadius * Math.cos(endRadians);
    const iy2 = radius + innerRadius * Math.sin(endRadians);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}`,
      'Z'
    ].join(' ');

    return {
      ...item,
      path,
      percentage,
      color: item.color || defaultColors[index % defaultColors.length]
    };
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              opacity={activeSegment === null || activeSegment === index ? 1 : 0.5}
              style={{
                cursor: 'pointer',
                transition: 'opacity 0.2s, transform 0.2s',
                transformOrigin: 'center',
                transform: activeSegment === index ? 'scale(1.02)' : 'scale(1)'
              }}
              onMouseEnter={() => setActiveSegment(index)}
              onMouseLeave={() => setActiveSegment(null)}
            />
          ))}
        </svg>

        {/* Center content */}
        {showCenter && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            {activeSegment !== null ? (
              <>
                <Typography variant="h5" fontWeight={600}>
                  {segments[activeSegment].percentage.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {segments[activeSegment].label}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" fontWeight={600}>
                  {centerValue || formatValue(total)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {centerLabel || 'Total'}
                </Typography>
              </>
            )}
          </Box>
        )}
      </Box>

      {/* Legend */}
      {showLegend && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2 }}>
          {segments.map((segment, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                opacity: activeSegment === null || activeSegment === index ? 1 : 0.5,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={() => setActiveSegment(index)}
              onMouseLeave={() => setActiveSegment(null)}
            >
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: segment.color
                }}
              />
              <Typography variant="caption">
                {segment.label} ({formatValue(segment.value)})
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SimpleDonutChart;
