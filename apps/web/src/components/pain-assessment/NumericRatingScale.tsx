'use client';

import { Box, Typography, Stack, Button, Tooltip, useTheme, alpha } from '@mui/material';
import { useCallback, KeyboardEvent } from 'react';

// ==============================|| INTERFACES ||============================== //

export interface NumericRatingScaleProps {
  /** Current selected value (0-10) */
  value: number | null;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Label for the component */
  label?: string;
  /** Help text to display */
  helpText?: string;
  /** Optional ID for accessibility */
  id?: string;
}

// ==============================|| CONSTANTS ||============================== //

const SCALE_POINTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const PAIN_DESCRIPTORS: Record<number, string> = {
  0: 'No Pain',
  1: 'Minimal',
  2: 'Mild',
  3: 'Uncomfortable',
  4: 'Moderate',
  5: 'Distracting',
  6: 'Distressing',
  7: 'Unmanageable',
  8: 'Intense',
  9: 'Severe',
  10: 'Worst Possible Pain'
};

const getSeverityColor = (value: number, theme: any) => {
  if (value <= 3) return theme.palette.success.main;
  if (value <= 6) return theme.palette.warning.main;
  return theme.palette.error.main;
};

const getSeverityBgColor = (value: number, theme: any) => {
  if (value <= 3) return alpha(theme.palette.success.main, 0.1);
  if (value <= 6) return alpha(theme.palette.warning.main, 0.1);
  return alpha(theme.palette.error.main, 0.1);
};

// ==============================|| NUMERIC RATING SCALE COMPONENT ||============================== //

const NumericRatingScale = ({
  value,
  onChange,
  disabled = false,
  label = 'Numeric Rating Scale (NRS)',
  helpText = 'Select a number that best represents your current pain level. 0 means no pain and 10 means the worst pain imaginable.',
  id = 'nrs-scale'
}: NumericRatingScaleProps) => {
  const theme = useTheme();

  const handleSelect = useCallback((selectedValue: number) => {
    if (!disabled) {
      onChange(selectedValue);
    }
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, currentValue: number) => {
    let newValue = currentValue;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        newValue = Math.max(0, currentValue - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        newValue = Math.min(10, currentValue + 1);
        break;
      case 'Home':
        event.preventDefault();
        newValue = 0;
        break;
      case 'End':
        event.preventDefault();
        newValue = 10;
        break;
      default:
        return;
    }

    handleSelect(newValue);
  }, [handleSelect]);

  return (
    <Box
      id={id}
      role="group"
      aria-labelledby={`${id}-label`}
      sx={{ width: '100%' }}
    >
      {/* Label */}
      <Typography
        id={`${id}-label`}
        variant="subtitle1"
        fontWeight={600}
        sx={{ mb: 1 }}
      >
        {label}
      </Typography>

      {/* Help Text */}
      {helpText && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {helpText}
        </Typography>
      )}

      {/* Scale Grid */}
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          flexWrap: { xs: 'wrap', sm: 'nowrap' }
        }}
        role="radiogroup"
        aria-label="Pain level from 0 to 10"
      >
        {SCALE_POINTS.map((point) => {
          const isSelected = value === point;
          const severity = getSeverityColor(point, theme);
          const bgColor = getSeverityBgColor(point, theme);

          return (
            <Tooltip
              key={point}
              title={PAIN_DESCRIPTORS[point]}
              arrow
              placement="top"
            >
              <Button
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => handleSelect(point)}
                onKeyDown={(e) => handleKeyDown(e, value ?? 0)}
                disabled={disabled}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Pain level ${point}: ${PAIN_DESCRIPTORS[point]}`}
                tabIndex={isSelected || (value === null && point === 0) ? 0 : -1}
                sx={{
                  minWidth: { xs: 36, sm: 44 },
                  height: { xs: 44, sm: 52 },
                  p: 0,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  fontWeight: 600,
                  borderRadius: 1,
                  transition: 'all 0.2s ease-in-out',
                  ...(isSelected
                    ? {
                        bgcolor: severity,
                        borderColor: severity,
                        color: theme.palette.common.white,
                        transform: 'scale(1.1)',
                        boxShadow: `0 4px 12px ${alpha(severity, 0.4)}`,
                        '&:hover': {
                          bgcolor: severity,
                          borderColor: severity
                        }
                      }
                    : {
                        bgcolor: 'transparent',
                        borderColor: alpha(severity, 0.5),
                        color: severity,
                        '&:hover': {
                          bgcolor: bgColor,
                          borderColor: severity,
                          transform: 'scale(1.05)'
                        }
                      }),
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(severity, 0.5)}`,
                    outlineOffset: 2
                  },
                  '&.Mui-disabled': {
                    bgcolor: isSelected ? alpha(theme.palette.grey[500], 0.3) : 'transparent',
                    color: theme.palette.grey[400],
                    borderColor: theme.palette.grey[300]
                  }
                }}
              >
                {point}
              </Button>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Scale Labels */}
      <Stack
        direction="row"
        justifyContent="space-between"
        sx={{ mt: 1, px: 0.5 }}
      >
        <Typography variant="caption" color="text.secondary">
          No Pain
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Moderate Pain
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Worst Pain
        </Typography>
      </Stack>

      {/* Selected Value Display */}
      {value !== null && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            bgcolor: getSeverityBgColor(value, theme),
            border: `1px solid ${alpha(getSeverityColor(value, theme), 0.3)}`
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
            <Typography
              variant="h4"
              sx={{ color: getSeverityColor(value, theme), fontWeight: 700 }}
            >
              {value}
            </Typography>
            <Typography variant="body1" color="text.primary">
              - {PAIN_DESCRIPTORS[value]}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default NumericRatingScale;
