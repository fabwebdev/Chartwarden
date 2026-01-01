'use client';

import { Box, Typography, useTheme } from '@mui/material';

interface SimpleGaugeChartProps {
  value: number;
  maxValue?: number;
  size?: number;
  thickness?: number;
  label?: string;
  formatValue?: (value: number) => string;
  thresholds?: {
    warning: number;
    critical: number;
  };
}

const SimpleGaugeChart = ({
  value,
  maxValue = 100,
  size = 160,
  thickness = 20,
  label,
  formatValue = (v) => `${v}%`,
  thresholds = { warning: 70, critical: 50 }
}: SimpleGaugeChartProps) => {
  const theme = useTheme();

  const percentage = Math.min(Math.max((value / maxValue) * 100, 0), 100);
  const radius = (size - thickness) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (percentage / 100) * circumference;

  // Determine color based on thresholds
  const getColor = () => {
    if (percentage >= thresholds.warning) return theme.palette.success.main;
    if (percentage >= thresholds.critical) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const center = size / 2;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: size, height: size / 2 + 20 }}>
        <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
          {/* Background arc */}
          <path
            d={`
              M ${thickness / 2} ${center}
              A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${center}
            `}
            fill="none"
            stroke={theme.palette.grey[200]}
            strokeWidth={thickness}
            strokeLinecap="round"
          />

          {/* Progress arc */}
          <path
            d={`
              M ${thickness / 2} ${center}
              A ${radius} ${radius} 0 0 1 ${size - thickness / 2} ${center}
            `}
            fill="none"
            stroke={getColor()}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
          />

          {/* Min label */}
          <text
            x={thickness / 2}
            y={center + thickness + 12}
            textAnchor="middle"
            fontSize="10"
            fill={theme.palette.text.secondary}
          >
            0
          </text>

          {/* Max label */}
          <text
            x={size - thickness / 2}
            y={center + thickness + 12}
            textAnchor="middle"
            fontSize="10"
            fill={theme.palette.text.secondary}
          >
            {maxValue}
          </text>
        </svg>

        {/* Center value */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center'
          }}
        >
          <Typography variant="h4" fontWeight={600} sx={{ color: getColor() }}>
            {formatValue(value)}
          </Typography>
          {label && (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SimpleGaugeChart;
