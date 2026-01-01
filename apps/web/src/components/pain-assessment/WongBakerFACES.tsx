'use client';

import { Box, Typography, Stack, ButtonBase, Tooltip, alpha } from '@mui/material';
import { useCallback, KeyboardEvent } from 'react';

// ==============================|| INTERFACES ||============================== //

export interface WongBakerFACESProps {
  /** Current selected value (0, 2, 4, 6, 8, or 10) */
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

interface FaceOption {
  value: number;
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const FACES: FaceOption[] = [
  {
    value: 0,
    label: 'No Hurt',
    description: 'I feel very happy because I have no pain at all',
    emoji: '😊',
    color: '#4caf50' // green
  },
  {
    value: 2,
    label: 'Hurts Little Bit',
    description: 'I feel mostly okay, with just a tiny bit of pain',
    emoji: '🙂',
    color: '#8bc34a' // light green
  },
  {
    value: 4,
    label: 'Hurts Little More',
    description: 'I feel some pain that bothers me a little',
    emoji: '😐',
    color: '#ffeb3b' // yellow
  },
  {
    value: 6,
    label: 'Hurts Even More',
    description: 'My pain is getting worse and harder to ignore',
    emoji: '😕',
    color: '#ff9800' // orange
  },
  {
    value: 8,
    label: 'Hurts Whole Lot',
    description: 'I feel a lot of pain that is very hard to bear',
    emoji: '😢',
    color: '#f44336' // red
  },
  {
    value: 10,
    label: 'Hurts Worst',
    description: 'I feel the worst pain possible, as bad as can be',
    emoji: '😭',
    color: '#b71c1c' // dark red
  }
];

// ==============================|| WONG-BAKER FACES COMPONENT ||============================== //

const WongBakerFACES = ({
  value,
  onChange,
  disabled = false,
  label = 'Wong-Baker FACES Pain Rating Scale',
  helpText = 'Point to or select the face that shows how much you hurt right now.',
  id = 'wong-baker-scale'
}: WongBakerFACESProps) => {
  const handleSelect = useCallback((selectedValue: number) => {
    if (!disabled) {
      onChange(selectedValue);
    }
  }, [disabled, onChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(FACES.length - 1, currentIndex + 1);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = FACES.length - 1;
        break;
      default:
        return;
    }

    handleSelect(FACES[newIndex].value);
  }, [handleSelect]);

  const getCurrentIndex = () => {
    if (value === null) return -1;
    return FACES.findIndex(face => face.value === value);
  };

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

      {/* Faces Grid */}
      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 2 }}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          flexWrap: { xs: 'wrap', md: 'nowrap' }
        }}
        role="radiogroup"
        aria-label="Pain faces from no hurt to hurts worst"
      >
        {FACES.map((face, index) => {
          const isSelected = value === face.value;
          const currentIndex = getCurrentIndex();

          return (
            <Tooltip
              key={face.value}
              title={
                <Box sx={{ textAlign: 'center', p: 0.5 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {face.label}
                  </Typography>
                  <Typography variant="caption">
                    {face.description}
                  </Typography>
                </Box>
              }
              arrow
              placement="top"
            >
              <ButtonBase
                onClick={() => handleSelect(face.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                disabled={disabled}
                role="radio"
                aria-checked={isSelected}
                aria-label={`${face.label}: ${face.description}`}
                tabIndex={isSelected || (currentIndex === -1 && index === 0) ? 0 : -1}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  p: { xs: 1, sm: 1.5 },
                  borderRadius: 2,
                  border: `2px solid ${isSelected ? face.color : alpha(face.color, 0.3)}`,
                  bgcolor: isSelected ? alpha(face.color, 0.15) : 'transparent',
                  transition: 'all 0.2s ease-in-out',
                  flex: { xs: '0 0 calc(33.33% - 8px)', md: 1 },
                  mb: { xs: 1, md: 0 },
                  minWidth: { xs: 80, sm: 100 },
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  ...(isSelected && {
                    transform: 'scale(1.05)',
                    boxShadow: `0 4px 16px ${alpha(face.color, 0.4)}`
                  }),
                  '&:hover:not(:disabled)': {
                    bgcolor: alpha(face.color, 0.1),
                    borderColor: face.color,
                    transform: 'scale(1.02)'
                  },
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(face.color, 0.5)}`,
                    outlineOffset: 2
                  }
                }}
              >
                {/* Face Emoji */}
                <Box
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3rem', md: '3.5rem' },
                    lineHeight: 1,
                    mb: 0.5,
                    filter: isSelected ? 'none' : 'grayscale(20%)',
                    transition: 'filter 0.2s ease-in-out'
                  }}
                  role="img"
                  aria-hidden="true"
                >
                  {face.emoji}
                </Box>

                {/* Value */}
                <Typography
                  variant="h6"
                  sx={{
                    color: face.color,
                    fontWeight: 700,
                    fontSize: { xs: '1rem', sm: '1.25rem' }
                  }}
                >
                  {face.value}
                </Typography>

                {/* Label */}
                <Typography
                  variant="caption"
                  sx={{
                    color: isSelected ? face.color : 'text.secondary',
                    fontWeight: isSelected ? 600 : 400,
                    textAlign: 'center',
                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    lineHeight: 1.2,
                    mt: 0.5
                  }}
                >
                  {face.label}
                </Typography>
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Stack>

      {/* Selected Value Display */}
      {value !== null && (
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(FACES.find(f => f.value === value)?.color || '#000', 0.1),
            border: `1px solid ${alpha(FACES.find(f => f.value === value)?.color || '#000', 0.3)}`
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
            <Typography
              sx={{
                fontSize: '2rem',
                lineHeight: 1
              }}
              role="img"
              aria-hidden="true"
            >
              {FACES.find(f => f.value === value)?.emoji}
            </Typography>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  color: FACES.find(f => f.value === value)?.color,
                  fontWeight: 700
                }}
              >
                {value} - {FACES.find(f => f.value === value)?.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {FACES.find(f => f.value === value)?.description}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default WongBakerFACES;
