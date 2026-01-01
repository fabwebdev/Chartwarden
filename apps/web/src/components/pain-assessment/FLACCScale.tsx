'use client';

import {
  Box,
  Typography,
  Stack,
  Grid,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Chip,
  Alert,
  useTheme,
  alpha,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { useCallback, useMemo } from 'react';
import { Warning2 } from 'iconsax-react';

// ==============================|| INTERFACES ||============================== //

export interface FLACCScores {
  face: number | null;
  legs: number | null;
  activity: number | null;
  cry: number | null;
  consolability: number | null;
}

export interface FLACCScaleProps {
  /** Current scores for each category */
  value: FLACCScores;
  /** Callback when any score changes */
  onChange: (scores: FLACCScores) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Label for the component */
  label?: string;
  /** Help text to display */
  helpText?: string;
  /** Optional ID for accessibility */
  id?: string;
  /** Use compact table view instead of radio buttons */
  compactView?: boolean;
}

// ==============================|| CONSTANTS ||============================== //

interface CategoryOption {
  value: number;
  description: string;
}

interface CategoryConfig {
  key: keyof FLACCScores;
  name: string;
  options: CategoryOption[];
}

const FLACC_CATEGORIES: CategoryConfig[] = [
  {
    key: 'face',
    name: 'Face',
    options: [
      { value: 0, description: 'No particular expression or smile' },
      { value: 1, description: 'Occasional grimace or frown, withdrawn, disinterested' },
      { value: 2, description: 'Frequent to constant frown, clenched jaw, quivering chin' }
    ]
  },
  {
    key: 'legs',
    name: 'Legs',
    options: [
      { value: 0, description: 'Normal position or relaxed' },
      { value: 1, description: 'Uneasy, restless, tense' },
      { value: 2, description: 'Kicking or legs drawn up' }
    ]
  },
  {
    key: 'activity',
    name: 'Activity',
    options: [
      { value: 0, description: 'Lying quietly, normal position, moves easily' },
      { value: 1, description: 'Squirming, shifting back and forth, tense' },
      { value: 2, description: 'Arched, rigid, or jerking' }
    ]
  },
  {
    key: 'cry',
    name: 'Cry',
    options: [
      { value: 0, description: 'No cry (awake or asleep)' },
      { value: 1, description: 'Moans or whimpers, occasional complaint' },
      { value: 2, description: 'Crying steadily, screams or sobs, frequent complaints' }
    ]
  },
  {
    key: 'consolability',
    name: 'Consolability',
    options: [
      { value: 0, description: 'Content, relaxed' },
      { value: 1, description: 'Reassured by occasional touching, hugging, or being talked to, distractable' },
      { value: 2, description: 'Difficult to console or comfort' }
    ]
  }
];

const getTotalScoreInterpretation = (total: number): { label: string; color: 'success' | 'warning' | 'error'; description: string } => {
  if (total <= 3) {
    return {
      label: 'Mild Discomfort',
      color: 'success',
      description: 'Mild discomfort or no pain. Consider non-pharmacological comfort measures.'
    };
  }
  if (total <= 6) {
    return {
      label: 'Moderate Pain',
      color: 'warning',
      description: 'Moderate pain. Consider pain intervention and reassess within 30-60 minutes.'
    };
  }
  return {
    label: 'Severe Pain',
    color: 'error',
    description: 'Severe discomfort/pain. Immediate intervention recommended. Reassess within 15-30 minutes.'
  };
};

const getScoreColor = (score: number, theme: any) => {
  if (score === 0) return theme.palette.success.main;
  if (score === 1) return theme.palette.warning.main;
  return theme.palette.error.main;
};

// ==============================|| FLACC SCALE COMPONENT ||============================== //

const FLACCScale = ({
  value,
  onChange,
  disabled = false,
  label = 'FLACC Scale (Face, Legs, Activity, Cry, Consolability)',
  helpText = 'Each category is scored 0-2, resulting in a total score of 0-10. This behavioral pain assessment scale is designed for patients who cannot verbalize their pain.',
  id = 'flacc-scale',
  compactView = false
}: FLACCScaleProps) => {
  const theme = useTheme();

  const handleScoreChange = useCallback((category: keyof FLACCScores, score: number) => {
    if (!disabled) {
      onChange({
        ...value,
        [category]: score
      });
    }
  }, [disabled, onChange, value]);

  const totalScore = useMemo(() => {
    const scores = Object.values(value);
    if (scores.some(s => s === null)) return null;
    return scores.reduce((sum, score) => (sum ?? 0) + (score ?? 0), 0);
  }, [value]);

  const completedCategories = useMemo(() => {
    return Object.values(value).filter(s => s !== null).length;
  }, [value]);

  const isComplete = completedCategories === 5;

  const interpretation = totalScore !== null ? getTotalScoreInterpretation(totalScore) : null;

  // Compact Table View
  if (compactView) {
    return (
      <Box id={id} sx={{ width: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {label}
          </Typography>
          <Chip
            label={`${completedCategories}/5`}
            size="small"
            color={isComplete ? 'success' : 'default'}
          />
        </Stack>

        {helpText && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {helpText}
          </Typography>
        )}

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.success.main }}>0</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.warning.main }}>1</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.error.main }}>2</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>Score</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {FLACC_CATEGORIES.map((category) => (
                <TableRow key={category.key}>
                  <TableCell sx={{ fontWeight: 500 }}>{category.name}</TableCell>
                  {category.options.map((option) => (
                    <TableCell
                      key={option.value}
                      align="center"
                      onClick={() => !disabled && handleScoreChange(category.key, option.value)}
                      sx={{
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        bgcolor: value[category.key] === option.value
                          ? alpha(getScoreColor(option.value, theme), 0.2)
                          : 'transparent',
                        borderLeft: `1px solid ${theme.palette.divider}`,
                        '&:hover': !disabled ? {
                          bgcolor: alpha(getScoreColor(option.value, theme), 0.1)
                        } : {},
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                        {option.description}
                      </Typography>
                    </TableCell>
                  ))}
                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      borderLeft: `2px solid ${theme.palette.divider}`,
                      color: value[category.key] !== null
                        ? getScoreColor(value[category.key]!, theme)
                        : 'text.disabled'
                    }}
                  >
                    {value[category.key] ?? '-'}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[500], 0.1) }}>
                <TableCell colSpan={4} sx={{ fontWeight: 600 }}>Total Score</TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    borderLeft: `2px solid ${theme.palette.divider}`,
                    color: interpretation
                      ? interpretation.color === 'success'
                        ? theme.palette.success.main
                        : interpretation.color === 'warning'
                          ? theme.palette.warning.main
                          : theme.palette.error.main
                      : 'text.disabled'
                  }}
                >
                  {totalScore ?? '-'}/10
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {interpretation && (
          <Box sx={{ mt: 2 }}>
            <Chip label={interpretation.label} color={interpretation.color} sx={{ fontWeight: 600 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {interpretation.description}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Full Radio Button View
  return (
    <Box
      id={id}
      role="form"
      aria-labelledby={`${id}-label`}
      sx={{ width: '100%' }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
        <Typography
          id={`${id}-label`}
          variant="subtitle1"
          fontWeight={600}
        >
          {label}
        </Typography>
        <Chip
          label={`${completedCategories}/5 completed`}
          size="small"
          color={isComplete ? 'success' : 'default'}
        />
      </Stack>

      {/* Help Text */}
      {helpText && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {helpText}
        </Typography>
      )}

      {/* Categories */}
      <Stack spacing={3}>
        {FLACC_CATEGORIES.map((category, categoryIndex) => (
          <Box
            key={category.key}
            sx={{
              p: 2,
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: value[category.key] !== null
                ? alpha(theme.palette.primary.main, 0.02)
                : 'transparent'
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {categoryIndex + 1}. {category.name}
              </Typography>
              {value[category.key] !== null && (
                <Chip
                  label={`Score: ${value[category.key]}`}
                  size="small"
                  sx={{
                    bgcolor: alpha(getScoreColor(value[category.key]!, theme), 0.2),
                    color: getScoreColor(value[category.key]!, theme),
                    fontWeight: 600
                  }}
                />
              )}
            </Stack>

            <FormControl component="fieldset" disabled={disabled} fullWidth>
              <RadioGroup
                aria-label={category.name}
                name={category.key}
                value={value[category.key] ?? ''}
                onChange={(e) => handleScoreChange(category.key, parseInt(e.target.value))}
              >
                <Grid container spacing={1}>
                  {category.options.map((option) => (
                    <Grid item xs={12} key={option.value}>
                      <FormControlLabel
                        value={option.value}
                        control={
                          <Radio
                            size="small"
                            sx={{
                              '&.Mui-checked': {
                                color: getScoreColor(option.value, theme)
                              }
                            }}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={option.value}
                              size="small"
                              sx={{
                                minWidth: 24,
                                height: 24,
                                bgcolor: value[category.key] === option.value
                                  ? getScoreColor(option.value, theme)
                                  : alpha(theme.palette.grey[500], 0.1),
                                color: value[category.key] === option.value
                                  ? theme.palette.common.white
                                  : 'inherit',
                                fontWeight: 600
                              }}
                            />
                            <Typography variant="body2">
                              {option.description}
                            </Typography>
                          </Box>
                        }
                        sx={{
                          mx: 0,
                          py: 0.5,
                          px: 1,
                          borderRadius: 1,
                          width: '100%',
                          bgcolor: value[category.key] === option.value
                            ? alpha(getScoreColor(option.value, theme), 0.08)
                            : 'transparent',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.04)
                          }
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
            </FormControl>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 3 }} />

      {/* Total Score Display */}
      <Box
        sx={{
          p: 3,
          borderRadius: 2,
          bgcolor: interpretation
            ? alpha(
                interpretation.color === 'success'
                  ? theme.palette.success.main
                  : interpretation.color === 'warning'
                    ? theme.palette.warning.main
                    : theme.palette.error.main,
                0.1
              )
            : alpha(theme.palette.grey[500], 0.1),
          border: `2px solid ${
            interpretation
              ? interpretation.color === 'success'
                ? theme.palette.success.main
                : interpretation.color === 'warning'
                  ? theme.palette.warning.main
                  : theme.palette.error.main
              : theme.palette.grey[300]
          }`
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" spacing={2}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="overline" color="text.secondary">
              Total Score
            </Typography>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                color: interpretation
                  ? interpretation.color === 'success'
                    ? theme.palette.success.main
                    : interpretation.color === 'warning'
                      ? theme.palette.warning.main
                      : theme.palette.error.main
                  : 'text.disabled'
              }}
            >
              {totalScore !== null ? totalScore : '--'}/10
            </Typography>
          </Box>

          {interpretation && (
            <Box sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
              <Chip
                label={interpretation.label}
                color={interpretation.color}
                sx={{ fontWeight: 600, mb: 1 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                {interpretation.description}
              </Typography>
            </Box>
          )}

          {!isComplete && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Complete all categories to see interpretation
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Severe Pain Alert */}
      {totalScore !== null && totalScore >= 7 && (
        <Alert
          severity="error"
          icon={<Warning2 size={20} />}
          sx={{ mt: 2 }}
        >
          <Typography variant="subtitle2">Severe Pain/Discomfort Detected</Typography>
          <Typography variant="body2">
            Immediate intervention is recommended. Consider notifying the physician for pain management orders.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default FLACCScale;
