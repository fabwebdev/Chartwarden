'use client';

import { Box, Typography, Tooltip, useTheme } from '@mui/material';

export interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  showLabels?: boolean;
  showValues?: boolean;
  formatValue?: (value: number) => string;
  orientation?: 'vertical' | 'horizontal';
  maxValue?: number;
}

const SimpleBarChart = ({
  data,
  height = 200,
  showLabels = true,
  showValues = true,
  formatValue = (v) => v.toLocaleString(),
  orientation = 'vertical',
  maxValue
}: SimpleBarChartProps) => {
  const theme = useTheme();
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main
  ];

  if (orientation === 'horizontal') {
    return (
      <Box sx={{ width: '100%' }}>
        {data.map((item, index) => (
          <Box key={item.label} sx={{ mb: 1.5 }}>
            {showLabels && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                {showValues && (
                  <Typography variant="body2" fontWeight={500}>
                    {formatValue(item.value)}
                  </Typography>
                )}
              </Box>
            )}
            <Tooltip title={`${item.label}: ${formatValue(item.value)}`} placement="top">
              <Box
                sx={{
                  height: 24,
                  bgcolor: 'grey.200',
                  borderRadius: 1,
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <Box
                  sx={{
                    height: '100%',
                    width: `${(item.value / max) * 100}%`,
                    bgcolor: item.color || defaultColors[index % defaultColors.length],
                    borderRadius: 1,
                    transition: 'width 0.5s ease-out'
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        ))}
      </Box>
    );
  }

  // Vertical orientation
  const barWidth = Math.max(20, Math.min(60, (100 / data.length) - 2));

  return (
    <Box sx={{ width: '100%', height }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-around',
          height: height - 40,
          borderBottom: 1,
          borderColor: 'divider',
          px: 1
        }}
      >
        {data.map((item, index) => (
          <Tooltip key={item.label} title={`${item.label}: ${formatValue(item.value)}`} placement="top">
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: '100%',
                justifyContent: 'flex-end',
                minWidth: barWidth
              }}
            >
              {showValues && (
                <Typography variant="caption" sx={{ mb: 0.5 }}>
                  {formatValue(item.value)}
                </Typography>
              )}
              <Box
                sx={{
                  width: barWidth,
                  height: `${Math.max(4, (item.value / max) * 100)}%`,
                  bgcolor: item.color || defaultColors[index % defaultColors.length],
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.5s ease-out',
                  minHeight: 4,
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8
                  }
                }}
              />
            </Box>
          </Tooltip>
        ))}
      </Box>
      {showLabels && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-around',
            mt: 1,
            px: 1
          }}
        >
          {data.map((item) => (
            <Typography
              key={item.label}
              variant="caption"
              color="text.secondary"
              sx={{
                textAlign: 'center',
                minWidth: barWidth,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {item.label}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default SimpleBarChart;
