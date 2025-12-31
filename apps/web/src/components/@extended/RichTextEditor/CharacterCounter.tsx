'use client';

// MATERIAL - UI
import { styled, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

// ==============================|| CHARACTER COUNTER - STYLED ||============================== //

const CounterWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.grey[50]
}));

// ==============================|| CHARACTER COUNTER - COMPONENT ||============================== //

interface CharacterCounterProps {
  current: number;
  limit?: number;
  showLimit?: boolean;
}

const CharacterCounter = ({ current, limit, showLimit = false }: CharacterCounterProps) => {
  const theme = useTheme();

  // Calculate percentage for progress bar
  const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;

  // Determine color based on usage
  const getColor = () => {
    if (!limit) return 'text.secondary';
    if (percentage >= 100) return 'error.main';
    if (percentage >= 90) return 'warning.main';
    return 'text.secondary';
  };

  const getProgressColor = (): 'primary' | 'error' | 'warning' => {
    if (percentage >= 100) return 'error';
    if (percentage >= 90) return 'warning';
    return 'primary';
  };

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <CounterWrapper>
      {showLimit && limit && (
        <Box sx={{ width: 60, mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={percentage}
            color={getProgressColor()}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.palette.grey[200]
            }}
          />
        </Box>
      )}

      <Typography
        variant="caption"
        sx={{
          color: getColor(),
          fontWeight: percentage >= 90 ? 600 : 400,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {formatNumber(current)}
        {showLimit && limit && (
          <>
            {' / '}
            {formatNumber(limit)}
          </>
        )}
        {' characters'}
      </Typography>
    </CounterWrapper>
  );
};

export default CharacterCounter;
